import { getInstrumentConfig } from '../config/instruments.config';

export class PipCalculator {
  static calculate(entry: number, sl: number, symbol: string): number {
    const config = getInstrumentConfig(symbol);
    return Math.abs(entry - sl) / config.pipSize;
  }

  static calculatePips(entry: number, exit: number, symbol: string): number {
    const config = getInstrumentConfig(symbol);
    return Math.abs(entry - exit) / config.pipSize;
  }

  static calculatePriceFromPips(price: number, pips: number, symbol: string): number {
    const config = getInstrumentConfig(symbol);
    return price + (pips * config.pipSize);
  }
}