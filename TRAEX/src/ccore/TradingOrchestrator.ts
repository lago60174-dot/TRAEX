import { TradeWorkflow } from './TradeWorkflow';
import { PortfolioService } from './PortfolioService';
import { IMarketDataService } from '../services/IMarketDataService';
import { WorkflowResult } from '../models/WorkflowResult';
import { logger } from '../utils/logger';
import { notificationService } from '../services/NotificationService';

export class TradingOrchestrator {
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(
    private tradeWorkflow: TradeWorkflow,
    private portfolioService: PortfolioService,
    private marketData: IMarketDataService
  ) {}

  async runTradingCycle(symbol: string, timeframe: string): Promise<WorkflowResult> {
    logger.info('🤖 Starting automated trading cycle:', { symbol, timeframe });
    
    const result = await this.tradeWorkflow.execute(symbol, timeframe);
    
    // Notification si trade exécuté
    if (result.status === 'SUCCESS' && result.trade) {
      await notificationService.notifyNewTrade(result.trade);
    }
    
    // Notification si risk bloque
    if (result.status === 'BLOCKED_RISK') {
      await notificationService.notifyCustom(
        '🛑 Trading Bloqué',
        `Raison: ${result.reason || 'Risk limits reached'}`,
        { type: 'RISK_BLOCKED', contextId: result.contextId }
      );
    }
    
    logger.info('✅ Trading cycle completed:', { 
      status: result.status, 
      contextId: result.contextId 
    });
    
    return result;
  }

  // DÉMARRAGE MONITORING AUTO SL/TP
  startMonitoring(): void {
    if (this.monitoringInterval) {
      logger.warn('Monitoring already active');
      return;
    }

    logger.info('🔍 Starting automated SL/TP monitoring...');
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitorAndCloseTrades();
      } catch (error) {
        logger.error('Error in monitoring loop:', error);
      }
    }, 5000); // Toutes les 5 secondes
  }

  // ARRÊT MONITORING
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('⏹️ Monitoring stopped');
    }
  }

  private async monitorAndCloseTrades(): Promise<void> {
    const openTrades = await this.portfolioService.getOpenTrades();
    
    if (openTrades.length === 0) return;

    const currentPrices = await this.marketData.getCurrentPrices();

    for (const trade of openTrades) {
      if (trade.status !== 'OPEN') continue;

      const currentPrice = currentPrices[trade.symbol];
      if (!currentPrice) continue;

      // VÉRIFICATION SL
      const slHit = trade.direction === 'BUY' 
        ? currentPrice <= trade.stopLoss 
        : currentPrice >= trade.stopLoss;
      
      // VÉRIFICATION TP
      const tpHit = trade.direction === 'BUY'
        ? currentPrice >= trade.takeProfit
        : currentPrice <= trade.takeProfit;

      // CLOUTURE AUTO SI SL OU TP ATTEINT
      if (slHit || tpHit) {
        const reason = slHit ? 'SL' : 'TP';
        
        logger.info(`🎯 ${reason} hit for trade ${trade.id}:`, {
          symbol: trade.symbol,
          entry: trade.entryPrice,
          currentPrice,
          sl: trade.stopLoss,
          tp: trade.takeProfit
        });

        try {
          const closedTrade = await this.portfolioService.closeTrade(trade.id, currentPrice);
          
          // Notification push auto
          await notificationService.notifyTradeClosed(closedTrade);
          
          // Vérifier si daily limit atteint après clôture
          const account = await this.portfolioService.getAccount();
          if (account.dailyStats.tradingStopped) {
            await notificationService.notifyRiskLimitReached(account);
          }
          
        } catch (error) {
          logger.error(`Failed to auto-close trade ${trade.id}:`, error);
        }
      }
    }
  }
}