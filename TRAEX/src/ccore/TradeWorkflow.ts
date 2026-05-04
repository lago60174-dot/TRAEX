import { StrategyEngine } from './StrategyEngine';
import { RiskEngine, PositionSizing } from './RiskEngine';
import { ExecutionEngine } from './ExecutionEngine';
import { PortfolioService } from './PortfolioService';
import { EventLogger } from './EventLogger';
import { Account } from '../models/Account';
import { Signal } from '../models/Signal';
import { Trade } from '../models/Trade';
import { WorkflowResult } from '../models/WorkflowResult';
import { logger } from '../utils/logger';

export interface TradingContext {
  contextId: string;
  account: Account;
  marketSnapshot: Record<string, number>;
  timestamp: number;
}

export class TradeWorkflow {
  constructor(
    private strategyEngine: StrategyEngine,
    private riskEngine: RiskEngine,
    private executionEngine: ExecutionEngine,
    private portfolioService: PortfolioService,
    private eventLogger: EventLogger
  ) {}

  async execute(symbol: string, timeframe: string): Promise<WorkflowResult> {
    const contextId = `ctx_${Date.now()}`;

    try {
      // PHASE 0: SNAPSHOT ATOMIQUE
      const context = await this.createContext(contextId);
      
      this.logEvent('WORKFLOW_STARTED', symbol, contextId, {
        balance: context.account.balance,
        equity: context.account.equity,
        timestamp: context.timestamp
      });

      // PHASE 1: STRATEGY (PURE)
      const signal = await this.strategyEngine.analyze(symbol, timeframe, {
        emaFast: 50,
        emaSlow: 200,
        riskPercent: 0.01,
        rrRatio: 2.0,
        swingLookback: 10,
        timeframe,
        symbol
      });

      if (!signal) {
        this.logEvent('SIGNAL_GENERATED', symbol, contextId, { result: 'NO_SIGNAL' });
        return { status: 'NO_SIGNAL', contextId };
      }

      this.logEvent('SIGNAL_GENERATED', symbol, contextId, signal);

      // PHASE 2: RISK VALIDATION
      if (!this.riskEngine.canTrade(context.account)) {
        this.logEvent('RISK_BLOCKED', symbol, contextId, {
          reason: 'Risk limits reached',
          dailyStats: context.account.dailyStats
        });
        return { status: 'BLOCKED_RISK', contextId, reason: 'Risk limits reached' };
      }

      const sizing = await this.riskEngine.calculatePositionSize(context.account, signal);
      
      this.logEvent('SIZING_CALCULATED', symbol, contextId, sizing);

      // PHASE 3: EXECUTION (BROKER ONLY)
      const trade = await this.executionEngine.executeTrade(
        signal,
        sizing.lotSize,
        context.account
      );

      if (trade.executionStatus === 'FAILED') {
        this.logEvent('ORDER_FAILED', symbol, contextId, {
          tradeId: trade.id,
          error: trade.executionError
        });
        return { status: 'FAILED_EXECUTION', contextId, trade };
      }

      this.logEvent('ORDER_FILLED', symbol, contextId, {
        tradeId: trade.id,
        executedPrice: trade.entryPrice,
        executionStatus: trade.executionStatus
      });

      // PHASE 4: COMMIT ATOMIQUE
      await this.portfolioService.commitTrade(trade);

      this.logEvent('TRADE_COMMITTED', symbol, contextId, {
        tradeId: trade.id,
        balance: context.account.balance,
        lotSize: trade.lotSize
      });

      return { status: 'SUCCESS', contextId, trade };

    } catch (error) {
      this.logEvent('ERROR', symbol, contextId, {
        error: error.message,
        stack: error.stack
      });
      
      logger.error('TradeWorkflow failed:', error);
      return { status: 'ERROR', contextId, error: error.message };
    }
  }

  private async createContext(contextId: string): Promise<TradingContext> {
    const account = await this.portfolioService.getAccount();
    
    return {
      contextId,
      account,
      marketSnapshot: {}, // Simplifié
      timestamp: Date.now()
    };
  }

  private logEvent(
    type: 'WORKFLOW_STARTED' | 'SIGNAL_GENERATED' | 'RISK_BLOCKED' | 
          'SIZING_CALCULATED' | 'ORDER_SENT' | 'ORDER_FILLED' | 
          'ORDER_FAILED' | 'TRADE_COMMITTED' | 'ERROR',
    symbol: string,
    contextId: string,
    payload: any
  ): void {
    this.eventLogger.log({
      type,
      symbol,
      contextId,
      payload
    });
  }
}