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
    const { reason } = req.body;
    
    // Récupérer le prix actuel (simplifié)
    const trade = await portfolioService.getOpenTrades().then(trades => 
      trades.find(t => t.id === id)
    );
    
    if (!trade) {
      return res.status(404).json({
        success: false,
        error: 'Trade not found or already closed'
      });
    }

    const closedTrade = await portfolioService.closeTrade(trade.id, trade.entryPrice); // Simplifié
    
    res.json({
      success: true,
      data: closedTrade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getTradeHistory = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await portfolioService.getTradeHistory(limit, offset);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};