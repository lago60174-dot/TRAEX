import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

export type TradeDirection = 'BUY' | 'SELL';
export type TradeStatus = 'PENDING' | 'OPEN' | 'CLOSED' | 'CANCELLED';
export type ExecutionStatus = 'SENT' | 'FILLED' | 'PARTIAL_FILL' | 'REJECTED' | 'FAILED';

@Entity()
export class Trade {
  @PrimaryColumn()
  id: string;

  @Column()
  accountId: string;

  @Column()
  symbol: string;

  @Column()
  direction: TradeDirection;

  @Column('decimal', { precision: 15, scale: 5 })
  entryPrice: number;

  @Column('decimal', { precision: 15, scale: 5 })
  stopLoss: number;

  @Column('decimal', { precision: 15, scale: 5 })
  takeProfit: number;

  @Column('decimal', { precision: 10, scale: 2 })
  lotSize: number;

  @Column()
  status: TradeStatus;

  @Column()
  executionStatus: ExecutionStatus;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  pnl: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  pnlPips: number;

  @Column()
  contextId: string;

  @Column()
  openedAt: Date;

  @Column({ nullable: true })
  closedAt?: Date;

  @Column({ nullable: true })
  closeReason?: 'SL' | 'TP' | 'MANUAL';

  @Column({ nullable: true })
  executionError?: string;

  @Column('decimal', { precision: 15, scale: 5, nullable: true })
  closePrice?: number;
}