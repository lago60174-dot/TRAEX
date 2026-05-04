import { supabase } from '../../config/supabase.config';
import { Account } from '../../models/Account';

export class AccountRepository {
  async getById(id: string): Promise<Account | null> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data ? this.mapToAccount(data) : null;
  }

  async getDefault(): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('No account found');
    return this.mapToAccount(data);
  }

  async update(account: Account): Promise<void> {
    const { error } = await supabase
      .from('accounts')
      .update({
        balance: account.balance,
        equity: account.equity,
        risk_settings: account.riskSettings,
        daily_stats: account.dailyStats,
        updated_at: new Date()
      })
      .eq('id', account.id);
    
    if (error) throw error;
  }

  async initialize(): Promise<Account> {
    const existing = await this.getById('acc_001');
    if (existing) return existing;

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        id: 'acc_001',
        currency: 'USD',
        initial_balance: 10000.00,
        balance: 10000.00,
        equity: 10000.00,
        risk_settings: {
          maxRiskPerTrade: 0.01,
          maxDailyLoss: 0.03,
          maxOpenTrades: 1,
          defaultRR: 2.0
        },
        daily_stats: {
          date: new Date().toISOString().split('T')[0],
          startingBalance: 10000.00,
          currentPnL: 0,
          tradesCount: 0,
          tradingStopped: false
        }
      })
      .select()
      .single();
    
    if (error) throw error;
    return this.mapToAccount(data);
  }

  private mapToAccount(data: any): Account {
    return {
      id: data.id,
      currency: data.currency,
      initialBalance: data.initial_balance,
      balance: data.balance,
      equity: data.equity,
      riskSettings: data.risk_settings,
      dailyStats: data.daily_stats,
      createdAt: new Date(data.created_at)
    };
  }
}

export const accountRepository = new AccountRepository();