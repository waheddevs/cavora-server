import type { NextFunction, Request, Response } from 'express';
import { EDITABLE_CONTENT_CACHE } from '../common/middleware/cache-control';
import { HttpCode } from '../common/errors/error-codes';
import FaqService from '../models/Faq.service';

const faqService = new FaqService();

const faqController = {
  async getFaqs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getFaqs');
      const result = await faqService.getFaqs();
      res.setHeader('Cache-Control', EDITABLE_CONTENT_CACHE);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getFaqs');
      next(err);
    }
  },
};

export default faqController;
