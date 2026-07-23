import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { HttpCode } from '../common/errors/error-codes';
import type { BookingHoldInput } from '../libs/types/booking';
import type { AuthContext, RequestContext } from '../libs/types/member';
import BookingService from '../models/Booking.service';

const bookingService = new BookingService();

function auth(req: Request): AuthContext {
  return req.auth as AuthContext;
}

function context(req: Request): RequestContext {
  const userAgent = req.get('user-agent');
  return {
    requestId: req.requestId,
    ipAddress: req.ip,
    ...(userAgent ? { userAgent: userAgent.slice(0, 1_024) } : {}),
  };
}

const bookingController = {
  async createBookingHold(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('createBookingHold');
      const body = req.validated.body as {
        departureId: string;
        tourId: number;
        travelers: number;
      };
      const input: BookingHoldInput = {
        ...body,
        departureId: new Types.ObjectId(body.departureId),
      };
      const result = await bookingService.createBookingHold(auth(req), input, context(req));
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(HttpCode.CREATED).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on createBookingHold');
      next(err);
    }
  },

  async getBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getBooking');
      const { id } = req.validated.params as { id: string };
      const result = await bookingService.getBooking(auth(req), id, context(req));
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getBooking');
      next(err);
    }
  },

  async cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('cancelBooking');
      const { id } = req.validated.params as { id: string };
      const result = await bookingService.cancelBooking(auth(req), id, context(req));
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on cancelBooking');
      next(err);
    }
  },
};

export default bookingController;
