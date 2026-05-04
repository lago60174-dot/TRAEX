import { Request, Response } from 'express';
import { portfolioService } from '../../core/PortfolioService';

export const openTrade = async (req: Request, res: Response) => {
  res.status(403).json({
    success: false,
    error: 'Use POST /api/strategy/run to execute trading cycle'
  });
};

export const closeTrade = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const trades = await portfolioService.getOpenTrades();
    const trade = trades.find(t => t.id === id);

    if (!trade) {
      return res.status(404).json({
        success: false,
        error: 'Trade not found or already closed'
      });
    }

    const closedTrade = await portfolioService.closeTrade(
      trade.id,
      trade.entryPrice
    );

    res.json({
      success: true,
      data: closedTrade
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      success: false,
      error: message
    });
  }
};

export const getOpenTrades = async (req: Request, res: Response) => {
  try {
    const trades = await portfolioService.getOpenTrades();

    res.json({
      success: true,
      data: { trades }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      success: false,
      error: message
    });
  }
};

export const getTradeHistory = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const result = await portfolioService.getTradeHistory(limit, offset);

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
