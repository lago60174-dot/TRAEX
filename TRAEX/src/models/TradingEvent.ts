import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

export type EventType = 
  | 'WORKFLOW_STARTED'
  | 'SIGNAL_GENERATED'
  | 'RISK_BLOCKED'
  | 'SIZING_CALCULATED'
  | 'ORDER_SENT'
  | 'ORDER_FILLED'
  | 'ORDER_FAILED'
  | 'TRADE_COMMITTED'
  | 'TRADE_CLOSED'
  | 'ERROR';

@Entity()
export class TradingEvent {
  @PrimaryColumn()
  id: string;

  @Column()
  type: EventType;

  @Column()
  symbol: string;

  @Column()
  @Index()
  contextId: string;

  @Column('bigint')
  timestamp: number;

  @Column('simple-json')
  payload: Record<string, any>;
}