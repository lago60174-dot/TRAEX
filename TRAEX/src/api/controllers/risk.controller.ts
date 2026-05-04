import { Request, Response } from 'express';
import { portfolioService } from '../../core/PortfolioService';
import { RiskEngine } from '../../core/RiskEngine';
import { PipValueEngine } from '../../core/PipValueEngine';
import { SimulatedMarketDataService } from '../../services/SimulatedMarketDataService';

const marketData = new SimulatedMarketDataService();
const pipValueEngine = new PipValueEngine(marketData);
const riskEngine = new RiskEngine(pipValueEngine, portfolioService);

export const getRiskStatus = async (req: Request, res: Response) => {
  try {
    const account = await portfolioService.getAccount();
    const canTrade = riskEngine.canTrade(account);
    const openTradesCount = await portfolioService.getOpenTradesCount();
    
    res.json({
      success: true,
      data: {
        canTrade,
        dailyLimitReached: account.dailyStats.tradingStopped,
        currentDailyPnL: account.dailyStats.currentPnL,
        maxDailyLoss: account.dailyStats.startingBalance * account.riskSettings.maxDailyLoss,
        openTradesCount,
        riskSettings: account.riskSettings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    const updated = await portfolioService.updateRiskSettings(settings);
    
    res.json({
      success: true,
      data: updated.riskSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
};