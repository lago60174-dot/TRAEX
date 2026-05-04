import { Router } from 'express';
import { getEvents } from '../controllers/event.controller';

const router = Router();

router.get('/:contextId', getEvents);

export { router as eventRoutes };
