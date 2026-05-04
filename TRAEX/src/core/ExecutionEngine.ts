import { IBrokerService, OrderResult } from '../services/IBrokerService';
import { Trade } from '../models/Trade';
import { Signal } from '../models/Signal';
import { Account } from '../models/Account';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export class ExecutionEngine {
  constructor(private brokerService: IBrokerService) {}

  async executeTrade(signal: Signal, lotSize: number, account: Account): Promise<Trade> {
    const trade = this.createTradeObject(signal, lotSize, account);

    try {
      logger.info('Sending order to broker:', { 
        tradeId: trade.id, 
        symbol: trade.symbol,
        direction: trade.direction,
        lotSize: trade.lotSize 
      });

      const result = await this.brokerService.openPosition(trade);

      if (result.filled) {
        trade.executionStatus = 'FILLED';
        trade.status = 'OPEN';
        trade.entryPrice = result.executedPrice; // Prix réel d'exécution
        
        logger.info('Order filled:', {
          tradeId: trade.id,
          executedPrice: result.executedPrice,
          latency: result.latencyMs
        });
      } else {
        trade.executionStatus = 'REJECTED';
        trade.status = 'CANCELLED';
        logger.warn('Order rejected by broker:', { tradeId: trade.id });
      }

    } catch (error) {
      trade.executionStatus = 'FAILED';
      trade.status = 'CANCELLED';
      trade.executionError = error.message;
      
      logger.error('Broker execution failed:', { 
        tradeId: trade.id, 
        error: error.message 
      });
    }

    return trade;
  }

  async closeTrade(trade: Trade, currentPrice: number): Promise<Trade> {
    try {
      await this.brokerService.closePosition(trade);
      
      // Le PnL est calculé par PortfolioService après fermeture
      logger.info('Trade closed via broker:', { tradeId: trade.id });
      
      return trade;
    } catch (error) {
      logger.error('Broker close failed:', { 
        tradeId: trade.id, 
        error: error.message 
      });
      throw error;
    }
  }

  private createTradeObject(signal: Signal, lotSize: number, account: Account): Trade {
    const trade = new Trade();
    
    trade.id = `t_${uuidv4().split('-')[0]}`;
    trade.accountId = account.id;
    trade.symbol = signal.symbol;
    trade.direction = signal.signal;
    trade.entryPrice = signal.entry;
    trade.stopLoss = signal.stopLoss;
    trade.takeProfit = signal.takeProfit;
    trade.lotSize = lotSize;
    trade.status = 'PENDING';
    trade.executionStatus = 'SENT';
    trade.pnl = 0;
    trade.pnlPips = 0;
    trade.riskPercent = account.riskSettings.maxRiskPerTrade * 100;
    trade.openedAt = new Date();
    trade.contextId = `ctx_${uuidv4().split('-')[0]}`;

    return trade;
  }
}