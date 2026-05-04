import { supabase } from '../../config/supabase.config';
import { TradingEvent, EventType } from '../../models/TradingEvent';

export class EventRepository {
  async save(event: TradingEvent): Promise<void> {
    const { error } = await supabase
      .from('trading_events')
      .insert({
        id: event.id,
        type: event.type,
        symbol: event.symbol,
        context_id: event.contextId,
        timestamp: event.timestamp,
        payload: event.payload
      });
    
    if (error) throw error;
  }

  async getByContextId(contextId: string): Promise<TradingEvent[]> {
    const { data, error } = await supabase
      .from('trading_events')
      .select('*')
      .eq('context_id', contextId)
      .order('timestamp', { ascending: true });
    
    if (error) throw error;
    return (data || []).map(this.mapToEvent);
  }

  async getByType(type: EventType): Promise<TradingEvent[]> {
    const { data, error } = await supabase
      .from('trading_events')
      .select('*')
      .eq('type', type)
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    return (data || []).map(this.mapToEvent);
  }

  private mapToEvent(data: any): TradingEvent {
    return {
      id: data.id,
      type: data.type as EventType,
      symbol: data.symbol,
      contextId: data.context_id,
      timestamp: data.timestamp,
      payload: data.payload
    };
  }
}

export const eventRepository = new EventRepository();