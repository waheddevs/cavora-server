import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { AppError } from '../common/errors/app-error';
import { ErrorCode, HttpCode } from '../common/errors/error-codes';
import { markUploadPersisted } from '../common/middleware/upload';
import type { BlogCommentStatus } from '../libs/enums/blog.enum';
import type { BookingStatus } from '../libs/enums/booking.enum';
import type { ContactMessageStatus } from '../libs/enums/engagement.enum';
import type {
  AdminBlogCommentInquiry,
  AdminBlogPostInquiry,
  BlogPostWriteInput,
  BlogPostWriteUpdateInput,
} from '../libs/types/blog';
import type { BookingInquiry } from '../libs/types/booking';
import type { ContactMessageInquiry } from '../libs/types/engagement';
import type { FaqInquiry, FaqInput, FaqUpdateInput } from '../libs/types/faq';
import type { MemberStatus } from '../libs/enums/member.enum';
import type { AuthContext, MemberInquiry, RequestContext } from '../libs/types/member';
import type { PaymentInquiry, PaymentRefundInput } from '../libs/types/payment';
import type {
  AdminDepartureInquiry,
  AdminTourInquiry,
  HomepageSelectionsInput,
  TourDepartureInput,
  TourDepartureUpdateInput,
  TourImageWriteInput,
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
      const input: TourImageWriteInput = {
        tourId: id,
        position,
        ...(req.validated.body as Omit<TourImageWriteInput, 'tourId' | 'position'>),
      };
      const result = await adminService.upsertTourImage(
        auth(req),
        input,
        context(req),
        req.file?.filename,
      );
      markUploadPersisted(req);
      noStore(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminUpsertTourImage');
      next(err);
    }
  },

  async uploadTourImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminUploadTourImage');
      if (!req.file) {
        throw new AppError(
          HttpCode.UNPROCESSABLE_ENTITY,
          ErrorCode.VALIDATION_ERROR,
          'An image file is required.',
        );
      }
      const { id } = req.validated.params as { id: number };
      const { altText } = req.validated.body as { altText: string };
      const result = await adminService.uploadTourImage(
        auth(req),
        id,
        req.file.filename,
        altText,
        context(req),
      );
      markUploadPersisted(req);
      noStore(res);
      res.status(HttpCode.CREATED).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminUploadTourImage');
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

  async deleteTour(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminDeleteTour');
      const { id } = req.validated.params as { id: number };
      await adminService.deleteTour(auth(req), id, context(req));
      noStore(res);
      res.status(HttpCode.NO_CONTENT).send();
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminDeleteTour');
      next(err);
    }
  },

  async deleteDeparture(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminDeleteDeparture');
      const { id } = req.validated.params as { id: string };
      await adminService.deleteDeparture(auth(req), id, context(req));
      noStore(res);
      res.status(HttpCode.NO_CONTENT).send();
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminDeleteDeparture');
      next(err);
    }
  },

  async deleteBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminDeleteBooking');
      const { id } = req.validated.params as { id: string };
      await adminService.deleteBooking(auth(req), id, context(req));
      noStore(res);
      res.status(HttpCode.NO_CONTENT).send();
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminDeleteBooking');
      next(err);
    }
  },

  async deleteBlogPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminDeleteBlogPost');
      const { id } = req.validated.params as { id: string };
      await adminService.deleteBlogPost(auth(req), id, context(req));
      noStore(res);
      res.status(HttpCode.NO_CONTENT).send();
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminDeleteBlogPost');
      next(err);
    }
  },

  async deleteComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminDeleteComment');
      const { id } = req.validated.params as { id: string };
      await adminService.deleteComment(auth(req), id, context(req));
      noStore(res);
      res.status(HttpCode.NO_CONTENT).send();
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminDeleteComment');
      next(err);
    }
  },

  async deleteFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminDeleteFaq');
      const { id } = req.validated.params as { id: string };
      await adminService.deleteFaq(auth(req), id, context(req));
      noStore(res);
      res.status(HttpCode.NO_CONTENT).send();
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminDeleteFaq');
      next(err);
    }
  },

  async deleteContactMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminDeleteContactMessage');
      const { id } = req.validated.params as { id: string };
      await adminService.deleteContactMessage(auth(req), id, context(req));
      noStore(res);
      res.status(HttpCode.NO_CONTENT).send();
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminDeleteContactMessage');
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

  async getFaqs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminGetFaqs');
      const result = await adminService.getFaqs(auth(req), req.validated.query as FaqInquiry);
      noStore(res);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminGetFaqs');
      next(err);
    }
  },

  async createFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminCreateFaq');
      const result = await adminService.createFaq(
        auth(req),
        req.validated.body as FaqInput,
        context(req),
      );
      noStore(res);
      res.status(HttpCode.CREATED).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminCreateFaq');
      next(err);
    }
  },

  async updateFaq(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminUpdateFaq');
      const { id } = req.validated.params as { id: string };
      const input: FaqUpdateInput = {
        _id: new Types.ObjectId(id),
        ...(req.validated.body as Omit<FaqUpdateInput, '_id'>),
      };
      const result = await adminService.updateFaq(auth(req), input, context(req));
      noStore(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminUpdateFaq');
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
        req.validated.body as BlogPostWriteInput,
        context(req),
        req.file?.filename,
      );
      markUploadPersisted(req);
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
      const input: BlogPostWriteUpdateInput = {
        _id: new Types.ObjectId(id),
        ...(req.validated.body as Omit<BlogPostWriteUpdateInput, '_id'>),
      };
      const result = await adminService.updateBlogPost(
        auth(req),
        input,
        context(req),
        req.file?.filename,
      );
      markUploadPersisted(req);
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

  async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminGetMembers');
      const result = await adminService.getMembers(auth(req), req.validated.query as MemberInquiry);
      noStore(res);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminGetMembers');
      next(err);
    }
  },

  async updateMemberStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('adminUpdateMemberStatus');
      const { id } = req.validated.params as { id: string };
      const { status } = req.validated.body as { status: MemberStatus };
      const result = await adminService.updateMemberStatus(
        auth(req),
        new Types.ObjectId(id),
        status,
        context(req),
      );
      noStore(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on adminUpdateMemberStatus');
      next(err);
    }
  },
};

export default adminController;
