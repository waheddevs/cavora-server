import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { AppError } from '../common/errors/app-error';
import { ErrorCode, HttpCode } from '../common/errors/error-codes';
import type { AuthContext, RequestContext } from '../libs/types/member';
import type { PaymentIntentInput } from '../libs/types/payment';
import PaymentService from '../models/Payment.service';

const paymentService = new PaymentService();

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

const paymentController = {
  async createPaymentIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('createPaymentIntent');
      const { bookingId } = req.validated.body as { bookingId: string };
      const { 'idempotency-key': idempotencyKey } = req.validated.headers as {
        'idempotency-key': string;
      };
      const input: PaymentIntentInput = {
        bookingId: new Types.ObjectId(bookingId),
        idempotencyKey,
      };
      const result = await paymentService.createOrReusePaymentIntent(
        auth(req),
        input,
        context(req),
      );
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on createPaymentIntent');
      next(err);
    }
  },

  async receiveStripeWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('receiveStripeWebhook');
      if (!Buffer.isBuffer(req.validated.body)) {
        throw new AppError(
          HttpCode.BAD_REQUEST,
          ErrorCode.PAYMENT_WEBHOOK_INVALID,
          'The Stripe webhook must use application/json.',
        );
      }
      const { 'stripe-signature': signature } = req.validated.headers as {
        'stripe-signature': string;
      };
      const result = await paymentService.handleStripeWebhook(
        req.validated.body,
        signature,
        context(req),
      );
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on receiveStripeWebhook');
      next(err);
    }
  },
};

export default paymentController;
