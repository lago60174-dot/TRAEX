export interface Signal {
  signal: 'BUY' | 'SELL';
  symbol: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  reason: string;
  confidence?: number;
}