import { Request, Response } from 'express';
import { portfolioService } from '../../core/PortfolioService';

export const getAccount = async (req: Request, res: Response) => {
  try {
    const account = await portfolioService.getAccount();

    res.json({
      success: true,
      data: account
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      success: false,
      error: message
    });
  }
};

export const getBalance = async (req: Request, res: Response) => {
  try {
    const account = await portfolioService.getAccount();

    res.json({
      success: true,
      data: {
        balance: account.balance,
        equity: account.equity
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      success: false,
      error: message
    });
  }
};
