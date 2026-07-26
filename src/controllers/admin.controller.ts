import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { HttpCode } from '../common/errors/error-codes';
import type { BlogCommentStatus } from '../libs/enums/blog.enum';
import type { BookingStatus } from '../libs/enums/booking.enum';
import type {
  ContactMessageStatus,
  NewsletterSubscriptionStatus,
} from '../libs/enums/engagement.enum';
import type {
  AdminBlogCommentInquiry,
  AdminBlogPostInquiry,
  BlogPostInput,
  BlogPostUpdateInput,
} from '../libs/types/blog';
import type { BookingInquiry } from '../libs/types/booking';
import type {
  ContactMessageInquiry,
  NewsletterSubscriptionInquiry,
} from '../libs/types/engagement';
import type { AuthContext, RequestContext } from '../libs/types/member';
import type { PaymentInquiry, PaymentRefundInput } from '../libs/types/payment';
import type {
  AdminDepartureInquiry,
  AdminTourInquiry,
  HomepageSelectionsInput,
  TourDepartureInput,
  TourDepartureUpdateInput,
  TourInput,
  TourUpdateInput,
} from '../libs/types/tour';
import AdminService from '../models/Admin.service';

const adminService = new AdminService();

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

function noStore(res: Response): void {
  res.setHeader('Cache-Control', 'private, no-store');
}

const adminController = {
  async getTours(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminGetTours');
      const result = await adminService.getTours(
        auth(req),
        req.validated.query as AdminTourInquiry,
      );
      noStore(res);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminGetTours');
      next(err);
    }
  },

  async getTour(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminGetTour');
      const { id } = req.validated.params as { id: number };
      const result = await adminService.getTour(auth(req), id);
      noStore(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminGetTour');
      next(err);
    }
  },

  async createTour(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminCreateTour');
      const { id, ...body } = req.validated.body as Omit<TourInput, '_id'> & { id: number };
      const result = await adminService.createTour(auth(req), { _id: id, ...body }, context(req));
      noStore(res);
      res.status(HttpCode.CREATED).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminCreateTour');
      next(err);
    }
  },

  async updateTour(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminUpdateTour');
      const { id } = req.validated.params as { id: number };
      const input: TourUpdateInput = {
        _id: id,
        ...(req.validated.body as Omit<TourUpdateInput, '_id'>),
      };
      const result = await adminService.updateTour(auth(req), input, context(req));
      noStore(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminUpdateTour');
      next(err);
    }
  },

  async upsertTourImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminUpsertTourImage');
      const { id, position } = req.validated.params as { id: number; position: number };
      const result = await adminService.upsertTourImage(
        auth(req),
        {
          tourId: id,
          position,
          ...(req.validated.body as { altText: string; url: string }),
        },
        context(req),
      );
      noStore(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminUpsertTourImage');
      next(err);
    }
  },

  async deleteTourImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminDeleteTourImage');
      const { id, position } = req.validated.params as { id: number; position: number };
      await adminService.deleteTourImage(auth(req), id, position, context(req));
      noStore(res);
      res.status(HttpCode.NO_CONTENT).send();
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminDeleteTourImage');
      next(err);
    }
  },

  async createDeparture(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminCreateDeparture');
      const { id } = req.validated.params as { id: number };
      const input: TourDepartureInput = {
        tourId: id,
        ...(req.validated.body as Omit<TourDepartureInput, 'tourId'>),
      };
      const result = await adminService.createDeparture(auth(req), input, context(req));
      noStore(res);
      res.status(HttpCode.CREATED).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminCreateDeparture');
      next(err);
    }
  },

  async getDepartures(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminGetDepartures');
      const result = await adminService.getDepartures(
        auth(req),
        req.validated.query as AdminDepartureInquiry,
      );
      noStore(res);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminGetDepartures');
      next(err);
    }
  },

  async updateDeparture(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminUpdateDeparture');
      const { id } = req.validated.params as { id: string };
      const input: TourDepartureUpdateInput = {
        _id: new Types.ObjectId(id),
        ...(req.validated.body as Omit<TourDepartureUpdateInput, '_id'>),
      };
      const result = await adminService.updateDeparture(auth(req), input, context(req));
      noStore(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminUpdateDeparture');
      next(err);
    }
  },

  async updateHomepageSelections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminUpdateHomepageSelections');
      const result = await adminService.updateHomepageSelections(
        auth(req),
        req.validated.body as HomepageSelectionsInput,
        context(req),
      );
      noStore(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminUpdateHomepageSelections');
      next(err);
    }
  },

  async getHomepageSelections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminGetHomepageSelections');
      const result = await adminService.getHomepageSelections(auth(req));
      noStore(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminGetHomepageSelections');
      next(err);
    }
  },

  async getBlogPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminGetBlogPosts');
      const result = await adminService.getBlogPosts(
        auth(req),
        req.validated.query as AdminBlogPostInquiry,
      );
      noStore(res);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminGetBlogPosts');
      next(err);
    }
  },

  async createBlogPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminCreateBlogPost');
      const result = await adminService.createBlogPost(
        auth(req),
        req.validated.body as BlogPostInput,
        context(req),
      );
      noStore(res);
      res.status(HttpCode.CREATED).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminCreateBlogPost');
      next(err);
    }
  },

  async updateBlogPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminUpdateBlogPost');
      const { id } = req.validated.params as { id: string };
      const input: BlogPostUpdateInput = {
        _id: new Types.ObjectId(id),
        ...(req.validated.body as Omit<BlogPostUpdateInput, '_id'>),
      };
      const result = await adminService.updateBlogPost(auth(req), input, context(req));
      noStore(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminUpdateBlogPost');
      next(err);
    }
  },

  async moderateComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminModerateComment');
      const { id } = req.validated.params as { id: string };
      const { status } = req.validated.body as { status: BlogCommentStatus };
      const result = await adminService.moderateComment(
        auth(req),
        new Types.ObjectId(id),
        status,
        context(req),
      );
      noStore(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminModerateComment');
      next(err);
    }
  },

  async getComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminGetComments');
      const { postId, ...query } = req.validated.query as Omit<
        AdminBlogCommentInquiry,
        'postId'
      > & {
        postId?: string;
      };
      const result = await adminService.getComments(auth(req), {
        ...query,
        ...(postId ? { postId: new Types.ObjectId(postId) } : {}),
      });
      noStore(res);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminGetComments');
      next(err);
    }
  },

  async getContactMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminGetContactMessages');
      const result = await adminService.getContactMessages(
        auth(req),
        req.validated.query as ContactMessageInquiry,
      );
      noStore(res);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminGetContactMessages');
      next(err);
    }
  },

  async updateContactStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminUpdateContactStatus');
      const { id } = req.validated.params as { id: string };
      const { status } = req.validated.body as { status: ContactMessageStatus };
      const result = await adminService.updateContactStatus(
        auth(req),
        new Types.ObjectId(id),
        status,
        context(req),
      );
      noStore(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminUpdateContactStatus');
      next(err);
    }
  },

  async getNewsletterSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminGetNewsletterSubscriptions');
      const result = await adminService.getNewsletterSubscriptions(
        auth(req),
        req.validated.query as NewsletterSubscriptionInquiry,
      );
      noStore(res);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminGetNewsletterSubscriptions');
      next(err);
    }
  },

  async updateNewsletterStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminUpdateNewsletterStatus');
      const { id } = req.validated.params as { id: string };
      const { status } = req.validated.body as { status: NewsletterSubscriptionStatus };
      const result = await adminService.updateNewsletterStatus(
        auth(req),
        new Types.ObjectId(id),
        status,
        context(req),
      );
      noStore(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminUpdateNewsletterStatus');
      next(err);
    }
  },

  async getBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminGetBookings');
      const result = await adminService.getBookings(
        auth(req),
        req.validated.query as BookingInquiry,
      );
      noStore(res);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminGetBookings');
      next(err);
    }
  },

  async updateBookingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminUpdateBookingStatus');
      const { id } = req.validated.params as { id: string };
      const { status } = req.validated.body as {
        status: BookingStatus.CANCELLED | BookingStatus.COMPLETED;
      };
      const result = await adminService.updateBookingStatus(
        auth(req),
        { bookingId: new Types.ObjectId(id), status },
        context(req),
      );
      noStore(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminUpdateBookingStatus');
      next(err);
    }
  },

  async getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminGetPayments');
      const result = await adminService.getPayments(
        auth(req),
        req.validated.query as PaymentInquiry,
      );
      noStore(res);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminGetPayments');
      next(err);
    }
  },

  async refundPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminRefundPayment');
      const { id } = req.validated.params as { id: string };
      const { 'idempotency-key': idempotencyKey } = req.validated.headers as {
        'idempotency-key': string;
      };
      const input: PaymentRefundInput = {
        paymentId: new Types.ObjectId(id),
        idempotencyKey,
        ...(req.validated.body as { amountCents?: number }),
      };
      const result = await adminService.refundPayment(auth(req), input, context(req));
      noStore(res);
      res.status(HttpCode.ACCEPTED).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminRefundPayment');
      next(err);
    }
  },
};

export default adminController;
