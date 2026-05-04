import { Router } from 'express';
import { openTrade, closeTrade, getOpenTrades, getTradeHistory } from '../controllers/trade.controller';

const router = Router();

router.post('/open', openTrade);
router.post('/close/:id', closeTrade);
router.get('/open', getOpenTrades);
router.get('/history', getTradeHistory);

export { router as tradeRoutes };