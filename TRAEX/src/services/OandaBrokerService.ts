import { IBrokerService, OrderResult } from './IBrokerService';
import { Trade } from '../models/Trade';

export class OandaBrokerService implements IBrokerService {
  private baseUrl = 'https://api-fxpractice.oanda.com/v3';

  constructor(private apiKey: string, private accountId: string) {}

  async openPosition(trade: Trade): Promise<OrderResult> {
    const units =
      trade.direction === 'BUY'
        ? trade.lotSize * 100000
        : -trade.lotSize * 100000;

    const response = await fetch(
      `${this.baseUrl}/accounts/${this.accountId}/orders`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order: {
            type: 'MARKET',
            instrument: trade.symbol.replace('/', '_'),
            units: units.toString(),
            stopLossOnFill: { price: trade.stopLoss.toString() },
            takeProfitOnFill: { price: trade.takeProfit.toString() }
          }
        })
      }
    );

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    return {
      filled: !!data.orderFillTransaction,
      executedPrice: parseFloat(
        data.orderFillTransaction?.price ?? trade.entryPrice
      ),
      filledLotSize: trade.lotSize,
      partialFill: false,
      latencyMs: 0
    };
  }

  async closePosition(trade: Trade): Promise<OrderResult> {
    const response = await fetch(
      `${this.baseUrl}/accounts/${this.accountId}/positions/${trade.symbol.replace('/', '_')}/close`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          longUnits: trade.direction === 'BUY' ? 'ALL' : undefined,
          shortUnits: trade.direction === 'SELL' ? 'ALL' : undefined
        })
      }
    );

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    const price =
      data?.longOrderFillTransaction?.price ??
      data?.shortOrderFillTransaction?.price ??
      0;

    return {
      filled: true,
      executedPrice: parseFloat(price),
      filledLotSize: trade.lotSize,
      partialFill: false,
      latencyMs: 0
    };
  }
}
