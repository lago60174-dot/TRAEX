import { Request, Response } from 'express';
import { notificationService } from '../../services/NotificationService';
import { portfolioService } from '../../core/PortfolioService';
import { tradeRepository } from '../../database/repositories/trade.repository';
import { logger } from '../../utils/logger';

// Vérifier le secret webhook depuis Supabase
const verifyWebhookSecret = (req: Request): boolean => {
  const secret = req.headers['x-webhook-secret'];
  return secret === process.env.RENDER_WEBHOOK_SECRET;
};

export const handleTradeOpened = async (req: Request, res: Response) => {
  if (!verifyWebhookSecret(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { tradeId } = req.body;
    const trade = await tradeRepository.getById(tradeId);
    
    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade not found' });
    }

    await notificationService.notifyNewTrade(trade);
    
    res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    logger.error('Failed to send trade opened notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleTradeClosed = async (req: Request, res: Response) => {
  if (!verifyWebhookSecret(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { tradeId } = req.body;
    const trade = await tradeRepository.getById(tradeId);
    
    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade not found' });
    }

    await notificationService.notifyTradeClosed(trade);
    
    res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    logger.error('Failed to send trade closed notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleDailySummary = async (req: Request, res: Response) => {
  if (!verifyWebhookSecret(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const account = await portfolioService.getAccount();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const trades = await tradeRepository.getTradesForPeriod(today, tomorrow);
    
    await notificationService.notifyDailySummary(account, trades);
    
    res.json({ success: true, message: 'Daily summary sent' });
  } catch (error) {
    logger.error('Failed to send daily summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleWeeklySummary = async (req: Request, res: Response) => {
  if (!verifyWebhookSecret(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const account = await portfolioService.getAccount();
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Lundi
    startOfWeek.setHours(0, 0, 0, 0);
    
    const trades = await tradeRepository.getTradesForPeriod(startOfWeek, now);
    
    await notificationService.notifyWeeklySummary(account, trades, startOfWeek, now);
    
    res.json({ success: true, message: 'Weekly summary sent' });
  } catch (error) {
    logger.error('Failed to send weekly summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleMonthlySummary = async (req: Request, res: Response) => {
  if (!verifyWebhookSecret(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const account = await portfolioService.getAccount();
    const now = new Date();
    const month = now.toLocaleString('fr-FR', { month: 'long' });
    const year = now.getFullYear();
    
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const trades = await tradeRepository.getTradesForPeriod(startOfMonth, now);
    
    await notificationService.notifyMonthlySummary(account, trades, month, year);
    
    res.json({ success: true, message: 'Monthly summary sent' });
  } catch (error) {
    logger.error('Failed to send monthly summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleYearlySummary = async (req: Request, res: Response) => {
  if (!verifyWebhookSecret(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const account = await portfolioService.getAccount();
    const now = new Date();
    const year = now.getFullYear();
    
    const startOfYear = new Date(year, 0, 1);
    const trades = await tradeRepository.getTradesForPeriod(startOfYear, now);
    
    await notificationService.notifyYearlySummary(account, trades, year);
    
    res.json({ success: true, message: 'Yearly summary sent' });
  } catch (error) {
    logger.error('Failed to send yearly summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Endpoint pour enregistrer la subscription push (appelé une fois depuis le frontend)
export const registerPushSubscription = async (req: Request, res: Response) => {
  try {
    const { endpoint, p256dh, auth, userAgent } = req.body;
    
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent,
        updated_at: new Date()
      }, { onConflict: 'endpoint' });
    
    if (error) throw error;
    
    res.json({ success: true, message: 'Subscription registered' });
  } catch (error) {
    logger.error('Failed to register push subscription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};