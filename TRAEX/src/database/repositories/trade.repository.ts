import { supabase } from '../../config/supabase.config';
import { Trade, TradeStatus, ExecutionStatus, TradeDirection } from '../../models/Trade';

export class TradeRepository {
  async save(trade: Trade): Promise<void> {
    const { error } = await supabase
      .from('trades')
      .insert({
        id: trade.id,
        account_id: trade.accountId,
        symbol: trade.symbol,
        direction: trade.direction,
        entry_price: trade.entryPrice,
        stop_loss: trade.stopLoss,
        take_profit: trade.takeProfit,
        lot_size: trade.lotSize,
        status: trade.status,
        execution_status: trade.executionStatus,
        pnl: trade.pnl,
        pnl_pips: trade.pnlPips,
        context_id: trade.contextId,
        opened_at: trade.openedAt,
        execution_error: trade.executionError
      });
    
    if (error) throw error;
  }

  async update(trade: Trade): Promise<void> {
    const { error } = await supabase
      .from('trades')
      .update({
        status: trade.status,
        execution_status: trade.executionStatus,
        pnl: trade.pnl,
        pnl_pips: trade.pnlPips,
        closed_at: trade.closedAt,
        close_reason: trade.closeReason,
        close_price: trade.closePrice,
        execution_error: trade.executionError
      })
      .eq('id', trade.id);
    
    if (error) throw error;
  }

  async getById(id: string): Promise<Trade | null> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data ? this.mapToTrade(data) : null;
  }

  async getOpenTrades(): Promise<Trade[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(this.mapToTrade);
  }

  async getOpenTradesCount(): Promise<number> {
    const { count, error } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'OPEN');
    
    if (error) throw error;
    return count || 0;
  }

  async getHistory(limit: number = 50, offset: number = 0): Promise<{ trades: Trade[], total: number }> {
    const { data, error, count } = await supabase
      .from('trades')
      .select('*', { count: 'exact' })
      .eq('status', 'CLOSED')
      .order('closed_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    return { trades: (data || []).map(this.mapToTrade), total: count || 0 };
  }

  async getByContextId(contextId: string): Promise<Trade | null> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('context_id', contextId)
      .single();
    
    if (error) throw error;
    return data ? this.mapToTrade(data) : null;
  }

  async getTradesForPeriod(startDate: Date, endDate: Date): Promise<Trade[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .gte('closed_at', startDate.toISOString())
      .lte('closed_at', endDate.toISOString())
      .eq('status', 'CLOSED')
      .order('closed_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(this.mapToTrade);
  }

  private mapToTrade(data: any): Trade {
    return {
      id: data.id,
      accountId: data.account_id,
      symbol: data.symbol,
      direction: data.direction as TradeDirection,
      entryPrice: data.entry_price,
      stopLoss: data.stop_loss,
      takeProfit: data.take_profit,
      lotSize: data.lot_size,
      status: data.status as TradeStatus,
      executionStatus: data.execution_status as ExecutionStatus,
      pnl: data.pnl || 0,
      pnlPips: data.pnl_pips || 0,
      contextId: data.context_id,
      openedAt: new Date(data.opened_at),
      closedAt: data.closed_at ? new Date(data.closed_at) : undefined,
      closeReason: data.close_reason,
      executionError: data.execution_error,
      closePrice: data.close_price
    };
  }
}

export const tradeRepository = new TradeRepository();