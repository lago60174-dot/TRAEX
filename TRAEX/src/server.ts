import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeVAPID } from './config/vapid.config';
import { checkSupabaseConnection } from './config/supabase.config';
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

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Initialize services
async function initializeServices() {
  try {
    // 1. Vérifier Supabase
    const supabaseConnected = await checkSupabaseConnection();
    if (!supabaseConnected) {
      throw new Error('Failed to connect to Supabase');
    }
    logger.info('✅ Supabase PostgreSQL connected');

    // 2. Initialiser VAPID
    initializeVAPID();
    logger.info('✅ VAPID push notifications initialized');

    // 3. Initialiser compte
    await portfolioService.initializeAccount();
    logger.info('✅ Account initialized');

    // 4. Initialiser services OANDA
    const marketData = new OandaMarketDataService(
      process.env.OANDA_API_KEY!,
      process.env.OANDA_ACCOUNT_ID!
    );
    
    const brokerService = new OandaBrokerService(
      process.env.OANDA_API_KEY!,
      process.env.OANDA_ACCOUNT_ID!
    );

    // 5. Initialiser core engines
    const pipValueEngine = new PipValueEngine(marketData);
    const riskEngine = new RiskEngine(pipValueEngine, portfolioService);
    const strategyEngine = new StrategyEngine(marketData);
    const executionEngine = new ExecutionEngine(brokerService);
    const eventLogger = new EventLogger();

    // 6. Initialiser workflow
    const tradeWorkflow = new TradeWorkflow(
      strategyEngine,
      riskEngine,
      executionEngine,
      portfolioService,
      eventLogger
    );

    // 7. Initialiser orchestrator
    const tradingOrchestrator = new TradingOrchestrator(
      tradeWorkflow,
      portfolioService,
      marketData
    );
    
    // Rendre disponible globalement
    (global as any).tradingOrchestrator = tradingOrchestrator;

    // 8. Démarrer monitoring automatique SL/TP
    tradingOrchestrator.startMonitoring();
    logger.info('🤖 Auto-monitoring SL/TP started (every 5s)');

    logger.info('✅ All services initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
}

// Routes
app.use('/api/account', accountRoutes);
app.use('/api/strategy', strategyRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    services: {
      supabase: 'connected',
      vapid: 'initialized',
      oanda: 'connected'
    }
  });
});

// Error handling
app.use(errorHandler);

// Start server
initializeServices().then(() => {
  app.listen(PORT, () => {
    logger.info(`🚀 Trading backend running on port ${PORT}`);
    logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    logger.info(`🔔 Push notifications: ACTIVE`);
    logger.info(`🤖 Auto-trading: ACTIVE`);
  });
});

export { app };