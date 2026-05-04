import { Trade } from '../models/Trade';

export interface OrderResult {
  filled: boolean;
  executedPrice: number;
  filledLotSize: number;
  partialFill: boolean;
  latencyMs: number;
}

export interface IBrokerService {
  openPosition(trade: Trade): Promise<OrderResult>;
  closePosition(trade: Trade): Promise<OrderResult>;
}