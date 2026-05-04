import { IMarketDataService } from './IMarketDataService';
import { OHLC } from '../models/MarketData';
import { INSTRUMENT_CONFIG } from '../config/instruments.config';

export class OandaMarketDataService implements IMarketDataService {
  private baseUrl = 'https://api-fxpractice.oanda.com/v3';

  constructor(private apiKey: string, private accountId: string) {}

  async getOHLC(symbol: string, timeframe: string, limit: number): Promise<OHLC[]> {
    const instrument = symbol.replace('/', '_');

    const response = await fetch(
      `${this.baseUrl}/instruments/${instrument}/candles?count=${limit}&granularity=${timeframe}`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      }
    );

    const data: any = await response.json(); // 🔥 FIX IMPORTANT

    return data.candles.map((c: any) => ({
      timestamp: new Date(c.time),
      open: parseFloat(c.mid.o),
      high: parseFloat(c.mid.h),
      low: parseFloat(c.mid.l),
      close: parseFloat(c.mid.c),
      volume: c.volume
    }));
  }

  async getLastPrice(symbol: string): Promise<number> {
    const prices = await this.getCurrentPrices();
    return prices[symbol] ?? 0;
  }

  async getCurrentPrices(): Promise<Record<string, number>> {
    const response = await fetch(
      `${this.baseUrl}/accounts/${this.accountId}/pricing`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      }
    );

    const data: any = await response.json(); // 🔥 FIX

    const prices: Record<string, number> = {};

    for (const p of data.prices ?? []) {
      const symbol = p.instrument.replace('_', '/');
      prices[symbol] = parseFloat(p.closeoutBid);
    }

    return prices;
  }

  async getCurrentSpread(symbol: string): Promise<number> {
    const prices = await this.getCurrentPrices();
    return prices[symbol] ? 1.2 : 1.5;
  }

  async getExchangeRate(pair: string): Promise<number> {
    const prices = await this.getCurrentPrices();
    return prices[pair] ?? 1;
  }
}
