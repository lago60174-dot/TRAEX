import { IBrokerService, OrderResult } from './IBrokerService';
import { Trade } from '../models/Trade';

export class OandaBrokerService implements IBrokerService {
  private baseUrl: string;
  
  constructor(private apiKey: string, private accountId: string) {
    this.baseUrl = 'https://api-fxpractice.oanda.com/v3';
  }

  async openPosition(trade: Trade): Promise<OrderResult> {
    const units = trade.direction === 'BUY' 
      ? (trade.lotSize * 100000).toString() 
      : (-trade.lotSize * 100000).toString();

    const response = await fetch(
      `${this.baseUrl}/accounts/${this.accountId}/orders`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order: {
            type: 'MARKET',
            instrument: trade.symbol.replace('/', '_'),
            units,
            stopLossOnFill: {
              price: trade.stopLoss.toString()
            },
            takeProfitOnFill: {
              price: trade.takeProfit.toString()
            }
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OANDA order failed: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    
    return {
      filled: data.orderFillTransaction !== undefined,
      executedPrice: parseFloat(data.orderFillTransaction?.price || trade.entryPrice),
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
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          longUnits: trade.direction === 'BUY' ? 'ALL' : undefined,
          shortUnits: trade.direction === 'SELL' ? 'ALL' : undefined
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OANDA close failed: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    
    return {
      filled: true,
      executedPrice: parseFloat(data.longOrderFillTransaction?.price || data.shortOrderFillTransaction?.price),
      filledLotSize: trade.lotSize,
      partialFill: false,
      latencyMs: 0
    };
  }
}