import { Account } from '../models/Account';
import { Signal } from '../models/Signal';
import { PipValueEngine } from './PipValueEngine';
import { PortfolioService } from './PortfolioService';
import { PipCalculator } from '../utils/PipCalculator';
import { logger } from '../utils/logger';

export interface PositionSizing {
  lotSize: number;
  riskAmount: number;
  stopLossPips: number;
  pipValue: number;
}

export class RiskEngine {
  constructor(
    private pipValueEngine: PipValueEngine,
    private portfolioService: PortfolioService
  ) {}

  canTrade(account: Account): boolean {
    const blocked = (
      account.dailyStats.tradingStopped ||
      this.isDailyLossReached(account) ||
      this.isMaxTradesReached(account)
    );

    if (blocked) {
      logger.info('RiskEngine blocked trade:', {
        tradingStopped: account.dailyStats.tradingStopped,
        dailyLossReached: this.isDailyLossReached(account),
        maxTradesReached: this.isMaxTradesReached(account)
      });
    }

    return !blocked;
  }

  async calculatePositionSize(account: Account, signal: Signal): Promise<PositionSizing> {
    const riskAmount = this.getRiskAmount(account);
    
    const stopLossPips = PipCalculator.calculate(
      signal.entry,
      signal.stopLoss,
      signal.symbol
    );

    const pipValuePerLot = await this.pipValueEngine.calculatePipValue(
      signal.symbol,
      1.0, // 1 lot standard pour référence
      account.currency
    );

    const rawLotSize = riskAmount / (stopLossPips * pipValuePerLot);
    const lotSize = this.normalizeLot(rawLotSize);

    return {
      lotSize,
      riskAmount,
      stopLossPips,
      pipValue: pipValuePerLot
    };
  }

  private getRiskAmount(account: Account): number {
    // Utilise equity (plus conservateur que balance)
    return account.equity * account.riskSettings.maxRiskPerTrade;
  }

  private normalizeLot(lotSize: number): number {
    // Minimum 0.01 lot, arrondi à 2 décimales
    return Math.max(0.01, Math.floor(lotSize * 100) / 100);
  }

  private isDailyLossReached(account: Account): boolean {
    const limit = account.dailyStats.startingBalance * account.riskSettings.maxDailyLoss;
    return account.dailyStats.currentPnL <= -limit;
  }

  private async isMaxTradesReached(account: Account): Promise<boolean> {
    const openCount = await this.portfolioService.getOpenTradesCount();
    return openCount >= account.riskSettings.maxOpenTrades;
  }
}