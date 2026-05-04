import { IBrokerService } from '../services/IBrokerService';
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
      logger.info('Sending order to broker', {
        tradeId: trade.id,
        symbol: trade.symbol,
        direction: trade.direction,
        lotSize: trade.lotSize
      });

      const result = await this.brokerService.openPosition(trade);

      if (result.filled) {
        trade.executionStatus = 'FILLED';
        trade.status = 'OPEN';
        trade.entryPrice = result.executedPrice;

        logger.info('Order filled', {
          tradeId: trade.id,
          executedPrice: result.executedPrice,
          latencyMs: result.latencyMs
        });
      } else {
        trade.executionStatus = 'REJECTED';
        trade.status = 'CANCELLED';

        logger.warn('Order rejected', { tradeId: trade.id });
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      trade.executionStatus = 'FAILED';
      trade.status = 'CANCELLED';
      trade.executionError = message;

      logger.error('Broker execution failed', {
        tradeId: trade.id,
        error: message
      });
    }

    return trade;
  }

  async closeTrade(trade: Trade, currentPrice: number): Promise<Trade> {
    try {
      await this.brokerService.closePosition(trade);

      logger.info('Trade closed via broker', {
        tradeId: trade.id,
        price: currentPrice
      });

      return trade;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Broker close failed', {
        tradeId: trade.id,
        error: message
      });

      throw new Error(message);
    }
  }

  private createTradeObject(signal: Signal, lotSize: number, account: Account): Trade {
    const trade = new Trade();

    trade.id = `t_${uuidv4().split('-')[0]}`;
    trade.accountId = account.id;
    trade.symbol = signal.symbol;

    // SAFE TYPE HANDLING
    trade.direction = signal.signal as 'BUY' | 'SELL';

    trade.entryPrice = signal.entry;
    trade.stopLoss = signal.stopLoss;
    trade.takeProfit = signal.takeProfit;

    trade.lotSize = lotSize;

    trade.status = 'PENDING';
    trade.executionStatus = 'SENT';

    trade.pnl = 0;
    trade.pnlPips = 0;

    // SAFE RISK (fix crash Render)
    trade.riskPercent = account.riskSettings?.maxRiskPerTrade
      ? account.riskSettings.maxRiskPerTrade * 100
      : 1;

    trade.openedAt = new Date();
    trade.contextId = `ctx_${uuidv4().split('-')[0]}`;

    return trade;
  }
}
