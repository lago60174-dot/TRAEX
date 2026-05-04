import { Router } from 'express';
import { getAccount, getBalance } from '../controllers/account.controller';

const router = Router();

router.get('/', getAccount);
router.get('/balance', getBalance);

export { router as accountRoutes };
