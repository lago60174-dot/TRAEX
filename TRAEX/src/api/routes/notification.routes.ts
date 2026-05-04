import { Router } from 'express';
import {
  handleTradeOpened,
  handleTradeClosed,
  handleDailySummary,
  handleWeeklySummary,
  handleMonthlySummary,
  handleYearlySummary,
  registerPushSubscription
} from '../controllers/notification.controller';

const router = Router();

// Webhooks appelés par Supabase Edge Functions
router.post('/webhook/trade-opened', handleTradeOpened);
router.post('/webhook/trade-closed', handleTradeClosed);
router.post('/webhook/daily-summary', handleDailySummary);
router.post('/webhook/weekly-summary', handleWeeklySummary);
router.post('/webhook/monthly-summary', handleMonthlySummary);
router.post('/webhook/yearly-summary', handleYearlySummary);

// Enregistrement subscription (appelé par frontend)
router.post('/register-push', registerPushSubscription);

export { router as notificationRoutes };