import { Request, Response } from 'express';

declare global {
  var tradingOrchestrator: any;
}

const tradingOrchestrator = (global as any).tradingOrchestrator;

export const runStrategy = async (req: Request, res: Response) => {
  try {
    const { symbol, timeframe } = req.body;

    if (!symbol || !timeframe) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, timeframe'
      });
    }

    if (!tradingOrchestrator) {
      return res.status(500).json({
        success: false,
        error: 'TradingOrchestrator not initialized'
      });
    }

    const result = await tradingOrchestrator.runTradingCycle(symbol, timeframe);

    res.json({
      success: true,
      data: result
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      success: false,
      error: message
    });
  }
};

export const getStatus = async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      active: true,
      lastRun: new Date().toISOString(),
      config: {
        emaFast: 50,
        emaSlow: 200,
        riskPercent: 0.01,
        rrRatio: 2.0
      }
    }
  });
};
