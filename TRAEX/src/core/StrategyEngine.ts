import { IMarketDataService } from '../services/IMarketDataService';
import { Signal } from '../models/Signal';
import { OHLC } from '../models/MarketData';
import { StrategyConfig } from '../models/StrategyConfig';
import { logger } from '../utils/logger';

export class StrategyEngine {
  constructor(private marketData: IMarketDataService) {}

  async analyze(symbol: string, timeframe: string, config: StrategyConfig): Promise<Signal | null> {
    try {
      const candles = await this.marketData.getOHLC(symbol, timeframe, 250);
      
      if (candles.length < 200) {
        logger.warn('Insufficient data for analysis');
        return null;
      }

      const ema50 = this.calculateEMA(candles, config.emaFast);
      const ema200 = this.calculateEMA(candles, config.emaSlow);
      
      const last = candles[candles.length - 1];
      const prev = candles[candles.length - 2];

      return this.detectSignal(symbol, last, prev, ema50, ema200, config);
    } catch (error) {
      logger.error('Strategy analysis failed:', error);
      return null;
    }
  }

  private detectSignal(
    symbol: string,
    last: OHLC,
    prev: OHLC,
    ema50: number,
    ema200: number,
    config: StrategyConfig
  ): Signal | null {
    const isBullTrend = ema50 > ema200;
    const isBearTrend = ema50 < ema200;

    if (isBullTrend && this.isBullPullback(last, ema50, prev)) {
      return this.buildBuySignal(symbol, last, config);
    }

    if (isBearTrend && this.isBearPullback(last, ema50, prev)) {
      return this.buildSellSignal(symbol, last, config);
    }

    return null;
  }

  private isBullPullback(last: OHLC, ema50: number, prev: OHLC): boolean {
    const isPullback = last.low <= ema50 && last.close >= ema50;
    const isBullish = last.close > last.open && last.close > prev.close;
    return isPullback && isBullish;
  }

  private isBearPullback(last: OHLC, ema50: number, prev: OHLC): boolean {
    const isPullback = last.high >= ema50 && last.close <= ema50;
    const isBearish = last.close < last.open && last.close < prev.close;
    return isPullback && isBearish;
  }

  private buildBuySignal(symbol: string, last: OHLC, config: StrategyConfig): Signal {
    const swingLow = this.findSwingLow(last);
    const risk = last.close - swingLow;
    const takeProfit = last.close + (risk * config.rrRatio);

    return {
      signal: 'BUY',
      symbol,
      entry: last.close,
      stopLoss: swingLow,
      takeProfit,
      reason: `EMA50>EMA200, pullback EMA50, bullish candle, RR 1:${config.rrRatio}`
    };
  }

  private buildSellSignal(symbol: string, last: OHLC, config: StrategyConfig): Signal {
    const swingHigh = this.findSwingHigh(last);
    const risk = swingHigh - last.close;
    const takeProfit = last.close - (risk * config.rrRatio);

    return {
      signal: 'SELL',
      symbol,
      entry: last.close,
      stopLoss: swingHigh,
      takeProfit,
      reason: `EMA50<EMA200, pullback EMA50, bearish candle, RR 1:${config.rrRatio}`
    };
  }

  private calculateEMA(candles: OHLC[], period: number): number {
    const k = 2 / (period + 1);
    let ema = candles[0].close;
    
    for (let i = 1; i < candles.length; i++) {
      ema = candles[i].close * k + ema * (1 - k);
    }
    
    return ema;
  }

  private findSwingLow(last: OHLC): number {
    // Simplifié: utiliser le low de la dernière bougie
    // En production: chercher le plus bas sur N bougies
    return last.low;
  }

  private findSwingHigh(last: OHLC): number {
    // Simplifié: utiliser le high de la dernière bougie
    return last.high;
  }
}