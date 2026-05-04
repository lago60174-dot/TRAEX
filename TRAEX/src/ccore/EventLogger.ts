import { TradingEvent, EventType } from '../models/TradingEvent';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class EventLogger {
  private events: TradingEvent[] = [];

  log(event: Omit<TradingEvent, 'id' | 'timestamp'>): TradingEvent {
    const fullEvent: TradingEvent = {
      ...event,
      id: uuidv4(),
      timestamp: Date.now()
    };

    this.events.push(fullEvent);
    
    // Persistance asynchrone (simulée)
    this.persistEvent(fullEvent).catch(err => 
      logger.error('Failed to persist event:', err)
    );

    return fullEvent;
  }

  getEvents(contextId: string): TradingEvent[] {
    return this.events
      .filter(e => e.contextId === contextId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  getEventsByType(type: EventType): TradingEvent[] {
    return this.events.filter(e => e.type === type);
  }

  getAllEvents(): TradingEvent[] {
    return [...this.events];
  }

  private async persistEvent(event: TradingEvent): Promise<void> {
    // En production: sauvegarder en base de données
    logger.debug('Event persisted:', { type: event.type, contextId: event.contextId });
  }
}

// Singleton
export const eventLogger = new EventLogger();