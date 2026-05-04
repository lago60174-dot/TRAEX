export interface StrategyConfig {
  emaFast: number;
  emaSlow: number;
  riskPercent: number;
  rrRatio: number;
  swingLookback: number;
  timeframe: string;
  symbol: string;
}

export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  emaFast: 50,
  emaSlow: 200,
  riskPercent: 0.01,
  rrRatio: 2.0,
  swingLookback: 10,
  timeframe: 'H1',
  symbol: 'EUR/USD'
};