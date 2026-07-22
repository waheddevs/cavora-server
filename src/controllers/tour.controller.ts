import type { NextFunction, Request, Response } from 'express';
import { HttpCode } from '../common/errors/error-codes';
import type { AvailabilityInquiry, TourInquiry } from '../libs/types/tour';
import TourService from '../models/Tour.service';

const tourService = new TourService();

const tourController = {
  async getTours(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getTours');
      const inquiry = req.validated.query as TourInquiry;
      const result = await tourService.getTours(inquiry);
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
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
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
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
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getRelatedTours');
      next(err);
    }
  },

  async getAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getAvailability');
      const { id } = req.validated.params as { id: number };
      const query = req.validated.query as Omit<AvailabilityInquiry, 'tourId'>;
      const result = await tourService.getAvailability({ ...query, tourId: id });
      res.setHeader('Cache-Control', 'public, max-age=30');
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getAvailability');
      next(err);
    }
  },
};

export default tourController;
