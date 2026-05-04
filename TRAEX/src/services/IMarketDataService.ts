import { OHLC } from '../models/MarketData';

export interface IMarketDataService {
  getOHLC(symbol: string, timeframe: string, limit: number): Promise<OHLC[]>;
  getLastPrice(symbol: string): Promise<number>;
  getCurrentPrices(): Promise<Record<string, number>>;
  getCurrentSpread(symbol: string): Promise<number>;
  getExchangeRate(pair: string): Promise<number>;
}