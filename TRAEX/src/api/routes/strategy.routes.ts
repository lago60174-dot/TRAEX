import { Router } from 'express';
import { runStrategy, getStatus } from '../controllers/strategy.controller';

const router = Router();

router.post('/run', runStrategy);
router.get('/status', getStatus);

export { router as strategyRoutes };