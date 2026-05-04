import { IMarketDataService } from './IMarketDataService';
import { OHLC } from '../models/MarketData';
import { INSTRUMENT_CONFIG } from '../config/instruments.config';

export class SimulatedMarketDataService implements IMarketDataService {
  private priceHistory: Map<string, number[]> = new Map();

  async getOHLC(symbol: string, timeframe: string, limit: number): Promise<OHLC[]> {
    const candles: OHLC[] = [];
    const basePrice = this.getBasePrice(symbol);
    const now = new Date();

    for (let i = limit; i > 0; i--) {
      const timestamp = new Date(now.getTime() - i * this.getTimeframeMs(timeframe));
      const volatility = 0.001; // 0.1% volatility
      
      const open = basePrice + (Math.random() - 0.5) * basePrice * volatility;
      const close = open + (Math.random() - 0.5) * basePrice * volatility;
      const high = Math.max(open, close) + Math.random() * basePrice * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * basePrice * volatility * 0.5;

      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 1000) + 100
      });
    }

    return candles;
  }

  async getLastPrice(symbol: string): Promise<number> {
    const candles = await this.getOHLC(symbol, 'M1', 1);
    return candles[0]?.close || this.getBasePrice(symbol);
  }

  async getCurrentPrices(): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    for (const symbol of Object.keys(INSTRUMENT_CONFIG)) {
      prices[symbol] = await this.getLastPrice(symbol);
    }
    return prices;
  }

  async getCurrentSpread(symbol: string): Promise<number> {
    // Spread simulé entre 1 et 3 pips
    return 1.0 + Math.random() * 2.0;
  }

  async getExchangeRate(pair: string): Promise<number> {
    const rates: Record<string, number> = {
      'USD/EUR': 0.85,
      'EUR/USD': 1.18,
      'USD/GBP': 0.73,
      'GBP/USD': 1.37,
      'USD/JPY': 110.0,
      'JPY/USD': 0.0091,
      'EUR/JPY': 129.5,
      'JPY/EUR': 0.0077,
      'GBP/JPY': 150.0,
      'JPY/GBP': 0.0067,
      'USD/CHF': 0.92,
      'CHF/USD': 1.09,
      'AUD/USD': 0.65,
      'USD/AUD': 1.54,
    };
    return rates[pair] || 1.0;
  }

  private getBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      'EUR/USD': 1.1000,
      'GBP/USD': 1.2500,
      'USD/JPY': 110.00,
      'GBP/JPY': 137.50,
      'EUR/JPY': 129.50,
      'AUD/USD': 0.6500,
      'USD/CHF': 0.9200,
      'XAU/USD': 1950.00,
      'US30': 35000.00,
    };
    return prices[symbol] || 1.0;
  }

  private getTimeframeMs(timeframe: string): number {
    const map: Record<string, number> = {
      'M1': 60000,
      'M5': 300000,
      'M15': 900000,
      'H1': 3600000,
      'H4': 14400000,
      'D1': 86400000,
    };
    return map[timeframe] || 3600000;
  }
}