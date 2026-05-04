import { Request, Response } from 'express';
import { eventLogger } from '../../core/EventLogger';

export const getEvents = async (req: Request, res: Response) => {
  try {
    const { contextId } = req.params;

    const events = eventLogger.getEvents(contextId);

    res.json({
      success: true,
      data: { events }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      success: false,
      error: message
    });
  }
};
