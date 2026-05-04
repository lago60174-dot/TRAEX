import { Entity, PrimaryColumn, Column } from 'typeorm';

export interface RiskSettings {
  maxRiskPerTrade: number;
  maxDailyLoss: number;
  maxOpenTrades: number;
  defaultRR: number;
}

export interface DailyStats {
  date: string;
  startingBalance: number;
  currentPnL: number;
  tradesCount: number;
  tradingStopped: boolean;
}

@Entity()
export class Account {
  @PrimaryColumn()
  id: string = 'acc_001';

  @Column()
  currency: string = 'USD';

  @Column('decimal', { precision: 15, scale: 2 })
  initialBalance: number = 10000.00;

  @Column('decimal', { precision: 15, scale: 2 })
  balance: number = 10000.00;

  @Column('decimal', { precision: 15, scale: 2 })
  equity: number = 10000.00;

  @Column('simple-json')
  riskSettings: RiskSettings = {
    maxRiskPerTrade: 0.01,
    maxDailyLoss: 0.03,
    maxOpenTrades: 1,
    defaultRR: 2.0
  };

  @Column('simple-json')
  dailyStats: DailyStats = {
    date: new Date().toISOString().split('T')[0],
    startingBalance: 10000.00,
    currentPnL: 0,
    tradesCount: 0,
    tradingStopped: false
  };

  @Column()
  createdAt: Date = new Date();
}