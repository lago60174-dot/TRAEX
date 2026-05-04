import { Router } from 'express';
import { getRiskStatus, updateSettings } from '../controllers/risk.controller';

const router = Router();

router.get('/', getRiskStatus);
router.put('/settings', updateSettings);

export { router as riskRoutes };
