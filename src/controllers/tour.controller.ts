import type { NextFunction, Request, Response } from 'express';
import { EDITABLE_CONTENT_CACHE } from '../common/middleware/cache-control';
import { HttpCode } from '../common/errors/error-codes';
import type { AvailabilityInquiry, TourCommentInput, TourInquiry } from '../libs/types/tour';
import TourService from '../models/Tour.service';

const tourService = new TourService();

const tourController = {
  async getTours(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getTours');
      const inquiry = req.validated.query as TourInquiry;
      const result = await tourService.getTours(inquiry);
      res.setHeader('Cache-Control', EDITABLE_CONTENT_CACHE);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on getTours');
      next(err);
    }
  },

  async getTour(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getTour');
      const { id } = req.validated.params as { id: number };
      const result = await tourService.getTour(id);
      res.setHeader('Cache-Control', EDITABLE_CONTENT_CACHE);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getTour');
      next(err);
    }
  },

  async getRelatedTours(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getRelatedTours');
      const { id } = req.validated.params as { id: number };
      const result = await tourService.getRelatedTours(id);
      res.setHeader('Cache-Control', EDITABLE_CONTENT_CACHE);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getRelatedTours');
      next(err);
    }
  },

  async getComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getTourComments');
      const { id } = req.validated.params as { id: number };
      const query = req.validated.query as { limit: number; page: number };
      const result = await tourService.getComments({ ...query, tourId: id });
      res.setHeader('Cache-Control', 'no-store');
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on getTourComments');
      next(err);
    }
  },

  async submitComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('submitTourComment');
      const { id } = req.validated.params as { id: number };
      const input: TourCommentInput = {
        ...(req.validated.body as Omit<TourCommentInput, 'memberId' | 'tourId'>),
        tourId: id,
        ...(req.auth ? { memberId: req.auth.memberId } : {}),
      };
      const result = await tourService.submitComment(input);
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(HttpCode.CREATED).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on submitTourComment');
      next(err);
    }
  },

  async recordView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('recordTourView');
      const { id } = req.validated.params as { id: number };
      const { visitorId } = req.validated.body as { visitorId: string };
      const result = await tourService.recordView({
        tourId: id,
        visitorId,
        ...(req.auth ? { memberId: req.auth.memberId } : {}),
      });
      res.setHeader('Cache-Control', 'no-store');
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on recordTourView');
      next(err);
    }
  },

  async getAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getAvailability');
      const { id } = req.validated.params as { id: number };
      const query = req.validated.query as Omit<AvailabilityInquiry, 'tourId'>;
      const result = await tourService.getAvailability({ ...query, tourId: id });
      res.setHeader('Cache-Control', EDITABLE_CONTENT_CACHE);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getAvailability');
      next(err);
    }
  },
};

export default tourController;
