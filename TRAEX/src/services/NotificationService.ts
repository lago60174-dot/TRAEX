import webpush from 'web-push';
import { supabase } from '../config/supabase.config';
import { Trade } from '../models/Trade';
import { Account } from '../models/Account';
import { logger } from '../utils/logger';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
  data?: Record<string, any>;
}

export class NotificationService {
  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*');

      if (!subscriptions || subscriptions.length === 0) {
        logger.warn('No push subscriptions found');
        return false;
      }

      let sent = 0;
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            JSON.stringify(payload)
          );
          sent++;
        } catch (error) {
          if (error.statusCode === 410) {
            // Subscription expirée, supprimer
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
        }
      }

      // Log notification
      await supabase.from('notifications').insert({
        type: payload.tag || 'GENERAL',
        title: payload.title,
        body: payload.body,
        data: payload.data,
        delivered: sent > 0,
        sent_count: sent
      });

      logger.info(`📱 Push notification sent to ${sent} devices:`, { title: payload.title });
      return sent > 0;
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      return false;
    }
  }

  // ========== NOTIFICATIONS SPÉCIFIQUES ==========

  async notifyNewTrade(trade: Trade): Promise<void> {
    const direction = trade.direction === 'BUY' ? '🟢 ACHAT' : '🔴 VENTE';
    
    await this.sendNotification({
      title: `${direction} ${trade.symbol}`,
      body: `Entrée: ${trade.entryPrice} | SL: ${trade.stopLoss} | TP: ${trade.takeProfit} | Lots: ${trade.lotSize}`,
      icon: '/icons/trade-open.png',
      badge: '/icons/badge.png',
      tag: 'NEW_TRADE',
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'Voir détails' }
      ],
      data: {
        type: 'NEW_TRADE',
        tradeId: trade.id,
        contextId: trade.contextId,
        symbol: trade.symbol,
        direction: trade.direction,
        entryPrice: trade.entryPrice,
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit,
        lotSize: trade.lotSize,
        riskPercent: trade.riskPercent,
        timestamp: Date.now()
      }
    });
  }

  async notifyTradeClosed(trade: Trade): Promise<void> {
    const isWin = trade.pnl > 0;
    const emoji = isWin ? '✅ GAIN' : '❌ PERTE';
    const pnlFormatted = trade.pnl > 0 
      ? `+$${trade.pnl.toFixed(2)}` 
      : `-$${Math.abs(trade.pnl).toFixed(2)}`;
    
    await this.sendNotification({
      title: `${emoji} ${trade.symbol} | ${pnlFormatted}`,
      body: `Entrée: ${trade.entryPrice} | Sortie: ${trade.closePrice} | ${trade.closeReason} | ${trade.pnlPips.toFixed(1)} pips`,
      icon: isWin ? '/icons/win.png' : '/icons/loss.png',
      badge: '/icons/badge.png',
      tag: 'TRADE_CLOSED',
      requireInteraction: true,
      data: {
        type: 'TRADE_CLOSED',
        tradeId: trade.id,
        contextId: trade.contextId,
        symbol: trade.symbol,
        direction: trade.direction,
        entryPrice: trade.entryPrice,
        closePrice: trade.closePrice,
        pnl: trade.pnl,
        pnlPips: trade.pnlPips,
        closeReason: trade.closeReason,
        timestamp: Date.now()
      }
    });
  }

  async notifyDailySummary(account: Account, trades: Trade[]): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const pnl = account.dailyStats.currentPnL;
    const isWin = pnl >= 0;
    const emoji = isWin ? '📈' : '📉';
    
    const winCount = trades.filter(t => t.pnl > 0).length;
    const lossCount = trades.filter(t => t.pnl < 0).length;
    
    await this.sendNotification({
      title: `${emoji} Résumé Journalier ${today}`,
      body: `PnL: ${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)} | Trades: ${trades.length} | ✅${winCount} ❌${lossCount} | Balance: $${account.balance.toFixed(2)}`,
      icon: '/icons/daily.png',
      badge: '/icons/badge.png',
      tag: 'DAILY_SUMMARY',
      data: {
        type: 'DAILY_SUMMARY',
        date: today,
        pnl: pnl,
        totalTrades: trades.length,
        winCount,
        lossCount,
        balance: account.balance,
        equity: account.equity,
        timestamp: Date.now()
      }
    });
  }

  async notifyWeeklySummary(account: Account, trades: Trade[], startDate: Date, endDate: Date): Promise<void> {
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const isWin = totalPnL >= 0;
    const emoji = isWin ? '📈' : '📉';
    
    const winCount = trades.filter(t => t.pnl > 0).length;
    const lossCount = trades.filter(t => t.pnl < 0).length;
    const winRate = trades.length > 0 ? (winCount / trades.length * 100).toFixed(1) : '0.0';
    
    await this.sendNotification({
      title: `${emoji} Résumé Hebdomadaire`,
      body: `Semaine du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')} | PnL: ${totalPnL > 0 ? '+' : ''}$${totalPnL.toFixed(2)} | Win Rate: ${winRate}% | Balance: $${account.balance.toFixed(2)}`,
      icon: '/icons/weekly.png',
      badge: '/icons/badge.png',
      tag: 'WEEKLY_SUMMARY',
      data: {
        type: 'WEEKLY_SUMMARY',
        period: 'WEEKLY',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        pnl: totalPnL,
        totalTrades: trades.length,
        winCount,
        lossCount,
        winRate: parseFloat(winRate),
        balance: account.balance,
        equity: account.equity,
        timestamp: Date.now()
      }
    });
  }

  async notifyMonthlySummary(account: Account, trades: Trade[], month: string, year: number): Promise<void> {
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const isWin = totalPnL >= 0;
    const emoji = isWin ? '📈' : '📉';
    
    const winCount = trades.filter(t => t.pnl > 0).length;
    const lossCount = trades.filter(t => t.pnl < 0).length;
    
    let maxDrawdown = 0;
    let peak = account.initialBalance;
    let runningBalance = account.initialBalance;
    
    for (const trade of trades.sort((a, b) => 
      new Date(a.closedAt!).getTime() - new Date(b.closedAt!).getTime()
    )) {
      runningBalance += trade.pnl;
      if (runningBalance > peak) peak = runningBalance;
      const drawdown = peak - runningBalance;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    await this.sendNotification({
      title: `${emoji} Résumé Mensuel ${month} ${year}`,
      body: `PnL: ${totalPnL > 0 ? '+' : ''}$${totalPnL.toFixed(2)} | Trades: ${trades.length} | Max Drawdown: $${maxDrawdown.toFixed(2)} | Balance: $${account.balance.toFixed(2)}`,
      icon: '/icons/monthly.png',
      badge: '/icons/badge.png',
      tag: 'MONTHLY_SUMMARY',
      data: {
        type: 'MONTHLY_SUMMARY',
        period: 'MONTHLY',
        month,
        year,
        pnl: totalPnL,
        totalTrades: trades.length,
        winCount,
        lossCount,
        maxDrawdown,
        balance: account.balance,
        equity: account.equity,
        timestamp: Date.now()
      }
    });
  }

  async notifyYearlySummary(account: Account, trades: Trade[], year: number): Promise<void> {
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalReturn = ((account.balance - account.initialBalance) / account.initialBalance * 100).toFixed(2);
    const isWin = totalPnL >= 0;
    const emoji = isWin ? '🏆' : '⚠️';
    
    const winCount = trades.filter(t => t.pnl > 0).length;
    const lossCount = trades.filter(t => t.pnl < 0).length;
    
    await this.sendNotification({
      title: `${emoji} Résumé Annuel ${year}`,
      body: `Retour: ${totalReturn}% | PnL: ${totalPnL > 0 ? '+' : ''}$${totalPnL.toFixed(2)} | Trades: ${trades.length} | Balance: $${account.balance.toFixed(2)}`,
      icon: '/icons/yearly.png',
      badge: '/icons/badge.png',
      tag: 'YEARLY_SUMMARY',
      data: {
        type: 'YEARLY_SUMMARY',
        period: 'YEARLY',
        year,
        pnl: totalPnL,
        totalReturn: parseFloat(totalReturn),
        totalTrades: trades.length,
        winCount,
        lossCount,
        balance: account.balance,
        equity: account.equity,
        initialBalance: account.initialBalance,
        timestamp: Date.now()
      }
    });
  }

  async notifyRiskLimitReached(account: Account): Promise<void> {
    await this.sendNotification({
      title: '🛑 TRADING ARRÊTÉ - Limite journalière atteinte',
      body: `Perte journalière: $${Math.abs(account.dailyStats.currentPnL).toFixed(2)} / $${(account.dailyStats.startingBalance * account.riskSettings.maxDailyLoss).toFixed(2)} | Trading suspendu jusqu'à demain.`,
      icon: '/icons/risk-stop.png',
      badge: '/icons/badge.png',
      tag: 'RISK_LIMIT',
      requireInteraction: true,
      data: {
        type: 'RISK_LIMIT',
        currentPnL: account.dailyStats.currentPnL,
        maxDailyLoss: account.dailyStats.startingBalance * account.riskSettings.maxDailyLoss,
        tradingStopped: true,
        timestamp: Date.now()
      }
    });
  }

  async notifyCustom(title: string, body: string, data?: Record<string, any>): Promise<void> {
    await this.sendNotification({
      title,
      body,
      icon: '/icons/custom.png',
      badge: '/icons/badge.png',
      tag: 'CUSTOM',
      data: {
        type: 'CUSTOM',
        ...data,
        timestamp: Date.now()
      }
    });
  }
}

export const notificationService = new NotificationService();