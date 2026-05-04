import { IMarketDataService } from './IMarketDataService';
import { OHLC } from '../models/MarketData';

export class OandaMarketDataService implements IMarketDataService {
  private baseUrl = 'https://api-fxpractice.oanda.com/v3';

  constructor(
    private apiKey: string,
    private accountId: string
  ) {}

  async getOHLC(symbol: string, timeframe: string, limit: number): Promise<OHLC[]> {
    const granularity = this.convertTimeframe(timeframe);
    const instrument = symbol.replace('/', '_');

    const response = await fetch(
      `${this.baseUrl}/instruments/${instrument}/candles?count=${limit}&price=M&granularity=${granularity}`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      }
    );

    if (!response.ok) {
      throw new Error(`OANDA API error: ${response.status}`);
    }

    const data = await response.json();

    return data.candles.map((c: any) => ({
      timestamp: new Date(c.time),
      open: Number(c.mid.o),
      high: Number(c.mid.h),
      low: Number(c.mid.l),
      close: Number(c.mid.c),
      volume: Number(c.volume)
    }));
  }

  async getLastPrice(symbol: string): Promise<number> {
    const prices = await this.getCurrentPrices();
    return prices[symbol] || 0;
  }

  async getCurrentPrices(): Promise<Record<string, number>> {
    const response = await fetch(
      `${this.baseUrl}/accounts/${this.accountId}/pricing`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      }
    );

    if (!response.ok) {
      throw new Error(`OANDA API error: ${response.status}`);
    }

    const data = await response.json();

    const prices: Record<string, number> = {};

    for (const price of data.prices as any[]) {
      const symbol = price.instrument.replace('_', '/');
      prices[symbol] = Number(price.closeoutBid);
    }

    return prices;
  }

  async getCurrentSpread(symbol: string): Promise<number> {
    const instrument = symbol.replace('/', '_');

    const response = await fetch(
      `${this.baseUrl}/accounts/${this.accountId}/pricing?instruments=${instrument}`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      }
    );

    if (!response.ok) {
      throw new Error(`OANDA API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data.prices[0];

    const bid = Number(price.closeoutBid);
    const ask = Number(price.closeoutAsk);

    return (ask - bid) / this.getPipSize(symbol);
  }

  async getExchangeRate(pair: string): Promise<number> {
    const [from, to] = pair.split('/');
    const symbol = `${from}/${to}`;

    const prices = await this.getCurrentPrices();

    if (prices[symbol]) return prices[symbol];

    const inverse = `${to}/${from}`;
    if (prices[inverse]) return 1 / prices[inverse];

    return 1.0;
  }

  private convertTimeframe(tf: string): string {
    const map: Record<string, string> = {
      M1: 'M1',
      M5: 'M5',
      M15: 'M15',
      H1: 'H1',
      H4: 'H4',
      D1: 'D'
    };

    return map[tf] || 'H1';
  }

  private getPipSize(symbol: string): number {
    return symbol.includes('JPY') ? 0.01 : 0.0001;
  }
}
