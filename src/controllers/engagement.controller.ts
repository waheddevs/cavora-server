import type { NextFunction, Request, Response } from 'express';
import { HttpCode } from '../common/errors/error-codes';
import type { ContactMessageInput } from '../libs/types/engagement';
import EngagementService from '../models/Engagement.service';

const engagementService = new EngagementService();

const engagementController = {
  async submitContactMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('submitContactMessage');
      const input: ContactMessageInput = {
        ...(req.validated.body as Omit<ContactMessageInput, 'memberId'>),
        ...(req.auth ? { memberId: req.auth.memberId } : {}),
      };
      const result = await engagementService.submitContactMessage(input);
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(HttpCode.CREATED).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on submitContactMessage');
      next(err);
    }
  },

  async subscribeNewsletter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('subscribeNewsletter');
      const { email, source } = req.validated.body as { email: string; source: string };
      const result = await engagementService.subscribeNewsletter(email, source);
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on subscribeNewsletter');
      next(err);
    }
  },

  async unsubscribeNewsletter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('unsubscribeNewsletter');
      const { token } = req.validated.params as { token: string };
      await engagementService.unsubscribeNewsletter(token);
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(HttpCode.NO_CONTENT).send();
    } catch (err) {
      req.log.error({ err }, 'ERROR on unsubscribeNewsletter');
      next(err);
    }
  },
};

export default engagementController;
