import { Account } from '../models/Account';
import { Trade } from '../models/Trade';
import { accountRepository } from '../database/repositories/account.repository';
import { tradeRepository } from '../database/repositories/trade.repository';
import { logger } from '../utils/logger';
import { PipCalculator } from '../utils/PipCalculator';
import { getInstrumentConfig } from '../config/instruments.config';

export class PortfolioService {
  async initializeAccount(): Promise<Account> {
    return accountRepository.initialize();
  }

  async getAccount(): Promise<Account> {
    return accountRepository.getDefault();
  }

  async commitTrade(trade: Trade): Promise<void> {
    await tradeRepository.save(trade);
    logger.info('💾 Trade committed to database:', { tradeId: trade.id });
  }

  async closeTrade(tradeId: string, closePrice: number): Promise<Trade> {
    const trade = await tradeRepository.getById(tradeId);
    if (!trade) throw new Error('Trade not found');
    if (trade.status === 'CLOSED') throw new Error('Trade already closed');

    // Calculer PnL
    const realizedPnL = this.calculateRealizedPnL(trade, closePrice);
    const pnlPips = PipCalculator.calculatePips(trade.entryPrice, closePrice, trade.symbol);

    // Mettre à jour trade
    trade.status = 'CLOSED';
    trade.executionStatus = 'FILLED';
    trade.pnl = realizedPnL;
    trade.pnlPips = pnlPips;
    trade.closedAt = new Date();
    trade.closePrice = closePrice;

    await tradeRepository.update(trade);

    // Mettre à jour compte (balance += PnL)
    const account = await this.getAccount();
    account.balance += realizedPnL;
    
    // Recalculer equity
    account.equity = await this.calculateEquity(account);
    
    // Mettre à jour daily stats
    await this.updateDailyStats(account, realizedPnL);
    
    await accountRepository.update(account);

    logger.info('💰 Trade closed:', {
      tradeId: trade.id,
      pnl: realizedPnL,
      pnlPips,
      newBalance: account.balance
    });

    return trade;
  }

  async getOpenTrades(): Promise<Trade[]> {
    return tradeRepository.getOpenTrades();
  }

  async getOpenTradesCount(): Promise<number> {
    return tradeRepository.getOpenTradesCount();
  }

  async getTradeHistory(limit: number = 50, offset: number = 0) {
    return tradeRepository.getHistory(limit, offset);
  }

  async updateRiskSettings(settings: Partial<Account['riskSettings']>): Promise<Account> {
    const account = await this.getAccount();
    account.riskSettings = { ...account.riskSettings, ...settings };
    await accountRepository.update(account);
    return account;
  }

  private calculateRealizedPnL(trade: Trade, closePrice: number): number {
    const config = getInstrumentConfig(trade.symbol);
    const priceDiff = trade.direction === 'BUY' 
      ? closePrice - trade.entryPrice 
      : trade.entryPrice - closePrice;
    
    return priceDiff * (config.contractSize * trade.lotSize);
  }

  private async calculateEquity(account: Account): Promise<number> {
    const openTrades = await this.getOpenTrades();
    const floatingPnL = openTrades.reduce((sum, trade) => {
      // Simplifié: utiliser le dernier PnL connu ou 0
      return sum + (trade.pnl || 0);
    }, 0);

    return account.balance + floatingPnL;
  }

  private async updateDailyStats(account: Account, pnl: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    if (account.dailyStats.date !== today) {
      account.dailyStats = {
        date: today,
        startingBalance: account.balance,
        currentPnL: 0,
        tradesCount: 0,
        tradingStopped: false
      };
    }
    
    account.dailyStats.currentPnL += pnl;
    account.dailyStats.tradesCount += 1;
    
    // Vérifier limite journalière
    const maxLoss = account.dailyStats.startingBalance * account.riskSettings.maxDailyLoss;
    if (account.dailyStats.currentPnL <= -maxLoss) {
      account.dailyStats.tradingStopped = true;
      logger.warn(`🚫 DAILY LIMIT REACHED: ${today}`);
    }
  }
}

export const portfolioService = new PortfolioService();