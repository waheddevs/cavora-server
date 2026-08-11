import type { NextFunction, Request, Response } from 'express';
import { HttpCode } from '../common/errors/error-codes';
import type { ContactMessageInput, NewsletterSubscriptionInput } from '../libs/types/engagement';
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

  async subscribeToNewsletter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('subscribeToNewsletter');
      const result = await engagementService.subscribeToNewsletter(
        req.validated.body as NewsletterSubscriptionInput,
      );
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(result.subscribed ? HttpCode.CREATED : HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on subscribeToNewsletter');
      next(err);
    }
  },
};

export default engagementController;
