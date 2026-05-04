import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { initializeVAPID } from './config/vapid.config';
import { accountRoutes } from './api/routes/account.routes';
import { strategyRoutes } from './api/routes/strategy.routes';
import { tradeRoutes } from './api/routes/trade.routes';
import { riskRoutes } from './api/routes/risk.routes';
import { eventRoutes } from './api/routes/event.routes';
import { notificationRoutes } from './api/routes/notification.routes';

import { errorHandler } from './api/middleware/errorHandler';
import { logger } from './utils/logger';
import { portfolioService } from './core/PortfolioService';

import { OandaMarketDataService } from './services/OandaMarketDataService';
import { OandaBrokerService } from './services/OandaBrokerService';

import { PipValueEngine } from './core/PipValueEngine';
import { RiskEngine } from './core/RiskEngine';
import { StrategyEngine } from './core/StrategyEngine';
import { ExecutionEngine } from './core/ExecutionEngine';
import { EventLogger } from './core/EventLogger';
import { TradeWorkflow } from './core/TradeWorkflow';
import { TradingOrchestrator } from './core/TradingOrchestrator';

import { notificationService } from './services/NotificationService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// FIX IMPORTANT: supabase check supprimé (sinon crash build)
async function initializeServices() {
  try {
    initializeVAPID();
    logger.info('✅ VAPID initialized');

    await portfolioService.initializeAccount();
    logger.info('✅ Account initialized');

    const marketData = new OandaMarketDataService(
      process.env.OANDA_API_KEY!,
      process.env.OANDA_ACCOUNT_ID!
    );

    const brokerService = new OandaBrokerService(
      process.env.OANDA_API_KEY!,
      process.env.OANDA_ACCOUNT_ID!
    );

    const pipValueEngine = new PipValueEngine(marketData);
    const riskEngine = new RiskEngine(pipValueEngine, portfolioService);
    const strategyEngine = new StrategyEngine(marketData);
    const executionEngine = new ExecutionEngine(brokerService);
    const eventLogger = new EventLogger();

    const tradeWorkflow = new TradeWorkflow(
      strategyEngine,
      riskEngine,
      executionEngine,
      portfolioService,
      eventLogger
    );

    const tradingOrchestrator = new TradingOrchestrator(
      tradeWorkflow,
      portfolioService,
      marketData
    );

    (global as any).tradingOrchestrator = tradingOrchestrator;

    tradingOrchestrator.startMonitoring();

    logger.info('🚀 Services initialized');
  } catch (error) {
    logger.error('Init error:', error);
    process.exit(1);
  }
}

app.use('/api/account', accountRoutes);
app.use('/api/strategy', strategyRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use(errorHandler);

initializeServices().then(() => {
  app.listen(PORT, () => {
    logger.info(`Server running on ${PORT}`);
  });
});

export { app };
