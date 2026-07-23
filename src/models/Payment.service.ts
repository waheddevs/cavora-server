import { createHash } from 'node:crypto';
import Stripe from 'stripe';
import mongoose, { type ClientSession } from 'mongoose';
import { AppError } from '../common/errors/app-error';
import { ErrorCode, HttpCode } from '../common/errors/error-codes';
import { env } from '../config/env';
import { AuditActorType } from '../libs/enums/audit.enum';
import { BookingStatus } from '../libs/enums/booking.enum';
import { PaymentProvider, PaymentStatus } from '../libs/enums/payment.enum';
import { MemberRole } from '../libs/enums/member.enum';
import type { Booking, BookingView } from '../libs/types/booking';
import type { AuthContext, RequestContext } from '../libs/types/member';
import type {
  Payment,
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentRefundInput,
  PaymentRefundResult,
  StripeWebhookResult,
} from '../libs/types/payment';
import AuditLog from '../schema/AuditLog.model';
import BookingModel from '../schema/Booking.model';
import PaymentModel from '../schema/Payment.model';
import TourDeparture from '../schema/TourDeparture.model';
import BookingService from './Booking.service';

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
const terminalPaymentStatuses = new Set<PaymentStatus>([
  PaymentStatus.REFUND_PENDING,
  PaymentStatus.SUCCEEDED,
  PaymentStatus.PARTIALLY_REFUNDED,
  PaymentStatus.REFUNDED,
]);

type StripeClient = Pick<Stripe, 'paymentIntents' | 'refunds' | 'webhooks'>;
type SuccessAction = 'duplicate' | 'processed' | 'refund';

function paymentNotFound(): AppError {
  return new AppError(HttpCode.NOT_FOUND, ErrorCode.PAYMENT_NOT_FOUND, 'Payment not found.');
}

function providerUnavailable(cause: unknown): AppError {
  return new AppError(
    HttpCode.SERVICE_UNAVAILABLE,
    ErrorCode.PAYMENT_PROVIDER_UNAVAILABLE,
    'The payment provider is temporarily unavailable.',
    { cause },
  );
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 11_000
  );
}

function mapPaymentIntentStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
  switch (status) {
    case 'requires_action':
      return PaymentStatus.REQUIRES_ACTION;
    case 'processing':
      return PaymentStatus.PROCESSING;
    case 'succeeded':
      return PaymentStatus.SUCCEEDED;
    case 'canceled':
      return PaymentStatus.CANCELLED;
    default:
      return PaymentStatus.REQUIRES_PAYMENT_METHOD;
  }
}

class PaymentService {
  private readonly bookingService: BookingService;

  public constructor(
    private readonly stripe: StripeClient = stripeClient,
    private readonly now: () => Date = () => new Date(),
    bookingService?: BookingService,
  ) {
    this.bookingService = bookingService ?? new BookingService(now);
  }

  public async createOrReusePaymentIntent(
    auth: AuthContext,
    input: PaymentIntentInput,
    context: RequestContext,
  ): Promise<PaymentIntentResult> {
    const booking = await this.bookingService.getBooking(auth, input.bookingId.toString(), context);
    this.assertBookingCanBePaid(booking);

    const idempotentPayment = await PaymentModel.findOne({
      idempotencyKey: input.idempotencyKey,
    })
      .lean<Payment>()
      .exec();
    if (idempotentPayment) {
      if (!idempotentPayment.bookingId.equals(input.bookingId)) {
        throw new AppError(
          HttpCode.CONFLICT,
          ErrorCode.IDEMPOTENCY_CONFLICT,
          'The idempotency key was already used for another booking.',
        );
      }
      const result = await this.retrievePaymentIntent(idempotentPayment);
      await this.recheckBookingCanBePaid(auth, input, context);
      return result;
    }

    const existingPayment = await PaymentModel.findOne({ bookingId: input.bookingId })
      .lean<Payment>()
      .exec();
    if (existingPayment) {
      const result = await this.retrievePaymentIntent(existingPayment);
      await this.recheckBookingCanBePaid(auth, input, context);
      return result;
    }

    let intent: Stripe.PaymentIntent;
    try {
      intent = await this.stripe.paymentIntents.create(
        {
          amount: booking.totalCents,
          currency: booking.currency.toLowerCase(),
          automatic_payment_methods: { enabled: true },
          description: `Cavora booking ${booking.reference}`,
          metadata: {
            bookingId: booking.id,
            bookingReference: booking.reference,
            memberId: auth.memberId.toString(),
          },
        },
        { idempotencyKey: `cavora:payment-intent:${booking.id}` },
      );
    } catch (err) {
      throw providerUnavailable(err);
    }

    if (!intent.client_secret) {
      throw providerUnavailable(new Error('Stripe returned no PaymentIntent client secret.'));
    }

    try {
      const payment = await PaymentModel.findOneAndUpdate(
        { bookingId: input.bookingId },
        {
          $setOnInsert: {
            bookingId: input.bookingId,
            idempotencyKey: input.idempotencyKey,
            provider: PaymentProvider.STRIPE,
            providerIntentId: intent.id,
            providerRefundIds: [],
            processedEventIds: [],
            settledRefundIds: [],
            status: mapPaymentIntentStatus(intent.status),
            amountCents: booking.totalCents,
            pendingRefundAmountCents: 0,
            refundedAmountCents: 0,
            currency: booking.currency,
          },
        },
        { new: true, setDefaultsOnInsert: true, upsert: true },
      )
        .lean<Payment>()
        .exec();
      if (!payment) throw new Error('Payment upsert returned no document.');
      const result = this.toPaymentIntentResult(payment, intent);
      await this.recheckBookingCanBePaid(auth, input, context);
      return result;
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const replay = await PaymentModel.findOne({ bookingId: input.bookingId })
          .lean<Payment>()
          .exec();
        if (replay) {
          const result = await this.retrievePaymentIntent(replay);
          await this.recheckBookingCanBePaid(auth, input, context);
          return result;
        }
        throw new AppError(
          HttpCode.CONFLICT,
          ErrorCode.IDEMPOTENCY_CONFLICT,
          'The idempotency key was already used.',
          { cause: err },
        );
      }
      throw err;
    }
  }

  public async handleStripeWebhook(
    rawBody: Buffer,
    signature: string,
    context: RequestContext,
  ): Promise<StripeWebhookResult> {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      throw new AppError(
        HttpCode.BAD_REQUEST,
        ErrorCode.PAYMENT_WEBHOOK_INVALID,
        'The Stripe webhook signature is invalid.',
        { cause: err },
      );
    }

    if (event.type === 'refund.updated') {
      await this.processRefundUpdate(event, event.data.object as Stripe.Refund, context);
      return { received: true };
    }
    if (!event.type.startsWith('payment_intent.')) return { received: true };
    const intent = event.data.object as Stripe.PaymentIntent;
    if (intent.object !== 'payment_intent') return { received: true };

    if (event.type === 'payment_intent.succeeded') {
      const action = await this.processSucceededPayment(event, intent, context);
      if (action === 'refund') await this.refundUnavailableBooking(event, intent, context);
      return { received: true };
    }

    const supportedEvents = new Set<string>([
      'payment_intent.canceled',
      'payment_intent.payment_failed',
      'payment_intent.processing',
      'payment_intent.requires_action',
    ]);
    if (supportedEvents.has(event.type)) {
      await this.processNonSuccessPayment(event, intent, context);
    }
    return { received: true };
  }

  public async refundPayment(
    auth: AuthContext,
    input: PaymentRefundInput,
    context: RequestContext,
  ): Promise<PaymentRefundResult> {
    if (auth.role !== MemberRole.ADMIN) {
      throw new AppError(
        HttpCode.FORBIDDEN,
        ErrorCode.AUTHORIZATION_REQUIRED,
        'Administrator access is required.',
      );
    }

    const payment = await PaymentModel.findById(input.paymentId).lean<Payment>().exec();
    if (!payment) throw paymentNotFound();
    this.normalizeRefundFields(payment);
    const remainingCents =
      payment.amountCents - payment.refundedAmountCents - payment.pendingRefundAmountCents;
    const amountCents = input.amountCents ?? remainingCents;
    if (
      amountCents <= 0 ||
      amountCents > remainingCents ||
      ![
        PaymentStatus.SUCCEEDED,
        PaymentStatus.PARTIALLY_REFUNDED,
        PaymentStatus.REFUND_PENDING,
      ].includes(payment.status)
    ) {
      throw new AppError(
        HttpCode.CONFLICT,
        ErrorCode.PAYMENT_REFUND_INVALID,
        'The requested refund is not valid for this payment.',
      );
    }

    const idempotencyDigest = createHash('sha256').update(input.idempotencyKey).digest('hex');
    let refund: Stripe.Refund;
    try {
      refund = await this.stripe.refunds.create(
        {
          payment_intent: payment.providerIntentId,
          amount: amountCents,
          metadata: {
            bookingId: payment.bookingId.toString(),
            paymentId: payment._id.toString(),
            requestedBy: auth.memberId.toString(),
          },
        },
        {
          idempotencyKey: `cavora:refund:${payment._id.toString()}:${idempotencyDigest}`,
        },
      );
    } catch (err) {
      throw providerUnavailable(err);
    }
    if (refund.status === 'failed' || refund.status === 'canceled') {
      throw new AppError(
        HttpCode.CONFLICT,
        ErrorCode.PAYMENT_REFUND_INVALID,
        'Stripe did not accept the refund.',
      );
    }

    return mongoose.connection.transaction(async (session) => {
      const current = await PaymentModel.findById(payment._id)
        .session(session)
        .lean<Payment>()
        .exec();
      if (!current) throw paymentNotFound();
      this.normalizeRefundFields(current);
      if (current.providerRefundIds.includes(refund.id)) {
        return {
          id: refund.id,
          paymentId: current._id.toString(),
          amountCents: refund.amount,
          status: current.status,
        };
      }

      const currentRemaining =
        current.amountCents - current.refundedAmountCents - current.pendingRefundAmountCents;
      if (refund.amount > currentRemaining) {
        throw new AppError(
          HttpCode.CONFLICT,
          ErrorCode.PAYMENT_REFUND_INVALID,
          'The payment refund balance changed before the refund completed.',
        );
      }

      const refundSucceeded = refund.status === 'succeeded';
      const refundedAmountCents =
        current.refundedAmountCents + (refundSucceeded ? refund.amount : 0);
      const pendingRefundAmountCents =
        current.pendingRefundAmountCents + (refundSucceeded ? 0 : refund.amount);
      const status = this.statusAfterRefund(
        refundedAmountCents,
        pendingRefundAmountCents,
        current.amountCents,
      );
      await PaymentModel.updateOne(
        { _id: current._id, providerRefundIds: { $ne: refund.id } },
        {
          $set: { refundedAmountCents, pendingRefundAmountCents, status },
          $addToSet: {
            providerRefundIds: refund.id,
            ...(refundSucceeded ? { settledRefundIds: refund.id } : {}),
          },
        },
        { session },
      ).exec();
      if (refundSucceeded && refundedAmountCents >= current.amountCents) {
        await this.markBookingRefunded(current.bookingId, session);
      }
      await this.writeMemberAudit(
        auth,
        'payment.refund_created',
        current._id.toString(),
        context,
        session,
        {
          amountCents: refund.amount,
          bookingId: current.bookingId.toString(),
          providerRefundId: refund.id,
          providerStatus: refund.status,
        },
      );
      return {
        id: refund.id,
        paymentId: current._id.toString(),
        amountCents: refund.amount,
        status,
      };
    });
  }

  private assertBookingCanBePaid(booking: BookingView): void {
    if (
      booking.status !== BookingStatus.PENDING_PAYMENT ||
      new Date(booking.holdExpiresAt) <= this.now()
    ) {
      throw new AppError(
        HttpCode.CONFLICT,
        ErrorCode.INVALID_BOOKING_STATE,
        'Only an unexpired pending booking can be paid.',
      );
    }
  }

  private async recheckBookingCanBePaid(
    auth: AuthContext,
    input: PaymentIntentInput,
    context: RequestContext,
  ): Promise<void> {
    const booking = await this.bookingService.getBooking(auth, input.bookingId.toString(), context);
    this.assertBookingCanBePaid(booking);
  }

  private async retrievePaymentIntent(payment: Payment): Promise<PaymentIntentResult> {
    let intent: Stripe.PaymentIntent;
    try {
      intent = await this.stripe.paymentIntents.retrieve(payment.providerIntentId);
    } catch (err) {
      throw providerUnavailable(err);
    }
    if (!intent.client_secret) {
      throw providerUnavailable(new Error('Stripe returned no PaymentIntent client secret.'));
    }
    this.assertIntentMatchesPayment(intent, payment);
    return this.toPaymentIntentResult(payment, intent);
  }

  private toPaymentIntentResult(
    payment: Payment,
    intent: Stripe.PaymentIntent,
  ): PaymentIntentResult {
    return {
      id: payment._id.toString(),
      bookingId: payment.bookingId.toString(),
      providerIntentId: payment.providerIntentId,
      status: mapPaymentIntentStatus(intent.status),
      amountCents: payment.amountCents,
      currency: payment.currency,
      clientSecret: intent.client_secret as string,
    };
  }

  private async processSucceededPayment(
    event: Stripe.Event,
    intent: Stripe.PaymentIntent,
    context: RequestContext,
  ): Promise<SuccessAction> {
    return mongoose.connection.transaction(async (session) => {
      const payment = await this.getEventPayment(intent, session);
      if (payment.processedEventIds.includes(event.id)) return 'duplicate';
      this.assertIntentMatchesPayment(intent, payment);

      if (payment.status === PaymentStatus.REFUNDED) {
        await this.recordEventOnly(payment, event.id, session);
        return 'processed';
      }

      const booking = await BookingModel.findById(payment.bookingId)
        .session(session)
        .lean<Booking>()
        .exec();
      if (!booking) throw paymentNotFound();
      if (
        booking.status !== BookingStatus.PENDING_PAYMENT &&
        booking.status !== BookingStatus.CONFIRMED
      ) {
        return 'refund';
      }

      const paymentUpdate = await PaymentModel.updateOne(
        { _id: payment._id, processedEventIds: { $ne: event.id } },
        {
          $set: {
            status: PaymentStatus.SUCCEEDED,
            paidAt: new Date(event.created * 1_000),
            failureCode: null,
            failureMessage: null,
          },
          $addToSet: { processedEventIds: event.id },
        },
        { session },
      ).exec();
      if (paymentUpdate.modifiedCount === 0) return 'duplicate';

      if (booking.status === BookingStatus.PENDING_PAYMENT) {
        const bookingUpdate = await BookingModel.updateOne(
          { _id: booking._id, status: BookingStatus.PENDING_PAYMENT },
          {
            $set: {
              status: BookingStatus.CONFIRMED,
              confirmedAt: new Date(event.created * 1_000),
            },
          },
          { session },
        ).exec();
        if (bookingUpdate.modifiedCount === 0) {
          throw new AppError(
            HttpCode.CONFLICT,
            ErrorCode.INVALID_BOOKING_STATE,
            'The booking state changed before payment confirmation completed.',
          );
        }
        await this.writeSystemAudit('payment.succeeded', payment._id.toString(), context, session, {
          bookingId: booking._id.toString(),
          stripeEventId: event.id,
        });
      }
      return 'processed';
    });
  }

  private async processNonSuccessPayment(
    event: Stripe.Event,
    intent: Stripe.PaymentIntent,
    context: RequestContext,
  ): Promise<void> {
    await mongoose.connection.transaction(async (session) => {
      const payment = await this.getEventPayment(intent, session);
      if (payment.processedEventIds.includes(event.id)) return;
      this.assertIntentMatchesPayment(intent, payment);

      if (terminalPaymentStatuses.has(payment.status)) {
        await this.recordEventOnly(payment, event.id, session);
        return;
      }

      const nextStatus =
        event.type === 'payment_intent.canceled'
          ? PaymentStatus.CANCELLED
          : event.type === 'payment_intent.payment_failed'
            ? PaymentStatus.FAILED
            : event.type === 'payment_intent.processing'
              ? PaymentStatus.PROCESSING
              : PaymentStatus.REQUIRES_ACTION;
      const failure = intent.last_payment_error;
      const update = await PaymentModel.updateOne(
        { _id: payment._id, processedEventIds: { $ne: event.id } },
        {
          $set: {
            status: nextStatus,
            ...(failure?.code ? { failureCode: failure.code.slice(0, 120) } : {}),
            ...(failure?.message ? { failureMessage: failure.message.slice(0, 1_000) } : {}),
          },
          $addToSet: { processedEventIds: event.id },
        },
        { session },
      ).exec();
      if (update.modifiedCount === 0) return;

      if (event.type === 'payment_intent.canceled') {
        const booking = await BookingModel.findOneAndUpdate(
          { _id: payment.bookingId, status: BookingStatus.PENDING_PAYMENT },
          { $set: { status: BookingStatus.CANCELLED, cancelledAt: this.now() } },
          { new: false, session },
        )
          .lean<Booking>()
          .exec();
        if (booking) {
          await TourDeparture.updateOne(
            { _id: booking.departureId, reservedSeats: { $gte: booking.travelers } },
            { $inc: { reservedSeats: -booking.travelers } },
            { session },
          ).exec();
        }
      }

      if (
        event.type === 'payment_intent.canceled' ||
        event.type === 'payment_intent.payment_failed'
      ) {
        await this.writeSystemAudit(
          event.type === 'payment_intent.canceled' ? 'payment.cancelled' : 'payment.failed',
          payment._id.toString(),
          context,
          session,
          { bookingId: payment.bookingId.toString(), stripeEventId: event.id },
        );
      }
    });
  }

  private async refundUnavailableBooking(
    event: Stripe.Event,
    intent: Stripe.PaymentIntent,
    context: RequestContext,
  ): Promise<void> {
    let refund: Stripe.Refund;
    try {
      refund = await this.stripe.refunds.create(
        {
          payment_intent: intent.id,
          reason: 'requested_by_customer',
          metadata: {
            bookingId: intent.metadata.bookingId ?? '',
            reason: 'booking_unavailable',
          },
        },
        { idempotencyKey: `cavora:auto-refund:${intent.id}` },
      );
    } catch (err) {
      throw providerUnavailable(err);
    }

    await mongoose.connection.transaction(async (session) => {
      const payment = await this.getEventPayment(intent, session);
      if (payment.processedEventIds.includes(event.id)) return;
      const refundSucceeded = refund.status === 'succeeded';
      const refundPending = refund.status === 'pending' || refund.status === 'requires_action';
      const refundedAmountCents = refundSucceeded ? refund.amount : 0;
      const pendingRefundAmountCents = refundPending ? refund.amount : 0;
      const paymentUpdate = await PaymentModel.updateOne(
        { _id: payment._id, processedEventIds: { $ne: event.id } },
        {
          $set: {
            status: this.statusAfterRefund(
              refundedAmountCents,
              pendingRefundAmountCents,
              payment.amountCents,
            ),
            paidAt: new Date(event.created * 1_000),
            refundedAmountCents,
            pendingRefundAmountCents,
          },
          $addToSet: {
            processedEventIds: event.id,
            providerRefundIds: refund.id,
            ...(refundSucceeded || !refundPending ? { settledRefundIds: refund.id } : {}),
          },
        },
        { session },
      ).exec();
      if (paymentUpdate.modifiedCount === 0) return;
      await this.writeSystemAudit(
        refundSucceeded
          ? 'payment.auto_refunded'
          : refundPending
            ? 'payment.refund_requested'
            : 'payment.auto_refund_failed',
        payment._id.toString(),
        context,
        session,
        {
          bookingId: payment.bookingId.toString(),
          providerRefundId: refund.id,
          stripeEventId: event.id,
        },
      );
    });
  }

  private async processRefundUpdate(
    event: Stripe.Event,
    refund: Stripe.Refund,
    context: RequestContext,
  ): Promise<void> {
    if (refund.object !== 'refund') return;
    await mongoose.connection.transaction(async (session) => {
      const payment = await PaymentModel.findOne({ providerRefundIds: refund.id })
        .session(session)
        .lean<Payment>()
        .exec();
      if (!payment) throw paymentNotFound();
      this.normalizeRefundFields(payment);
      if (payment.processedEventIds.includes(event.id)) return;
      if (payment.settledRefundIds.includes(refund.id)) {
        await this.recordEventOnly(payment, event.id, session);
        return;
      }
      if (refund.status === 'pending' || refund.status === 'requires_action') {
        await this.recordEventOnly(payment, event.id, session);
        return;
      }

      const refundSucceeded = refund.status === 'succeeded';
      const pendingRefundAmountCents = Math.max(
        0,
        payment.pendingRefundAmountCents - refund.amount,
      );
      const refundedAmountCents =
        payment.refundedAmountCents + (refundSucceeded ? refund.amount : 0);
      const status = this.statusAfterRefund(
        refundedAmountCents,
        pendingRefundAmountCents,
        payment.amountCents,
      );
      const update = await PaymentModel.updateOne(
        {
          _id: payment._id,
          processedEventIds: { $ne: event.id },
          settledRefundIds: { $ne: refund.id },
        },
        {
          $set: { pendingRefundAmountCents, refundedAmountCents, status },
          $addToSet: {
            processedEventIds: event.id,
            settledRefundIds: refund.id,
          },
        },
        { session },
      ).exec();
      if (update.modifiedCount === 0) return;
      if (refundSucceeded && refundedAmountCents >= payment.amountCents) {
        await this.markBookingRefunded(payment.bookingId, session);
      }
      await this.writeSystemAudit(
        refundSucceeded ? 'payment.refund_succeeded' : 'payment.refund_failed',
        payment._id.toString(),
        context,
        session,
        {
          amountCents: refund.amount,
          bookingId: payment.bookingId.toString(),
          providerRefundId: refund.id,
          stripeEventId: event.id,
        },
      );
    });
  }

  private async getEventPayment(
    intent: Stripe.PaymentIntent,
    session: ClientSession,
  ): Promise<Payment> {
    const payment = await PaymentModel.findOne({
      provider: PaymentProvider.STRIPE,
      providerIntentId: intent.id,
    })
      .session(session)
      .lean<Payment>()
      .exec();
    if (!payment) throw paymentNotFound();
    this.normalizeRefundFields(payment);
    return payment;
  }

  private normalizeRefundFields(payment: Payment): void {
    payment.processedEventIds ??= [];
    payment.providerRefundIds ??= [];
    payment.settledRefundIds ??= [];
    payment.pendingRefundAmountCents ??= 0;
    payment.refundedAmountCents ??= 0;
  }

  private statusAfterRefund(
    refundedAmountCents: number,
    pendingRefundAmountCents: number,
    totalAmountCents: number,
  ): PaymentStatus {
    if (pendingRefundAmountCents > 0) return PaymentStatus.REFUND_PENDING;
    if (refundedAmountCents >= totalAmountCents) return PaymentStatus.REFUNDED;
    if (refundedAmountCents > 0) return PaymentStatus.PARTIALLY_REFUNDED;
    return PaymentStatus.SUCCEEDED;
  }

  private async markBookingRefunded(
    bookingId: Payment['bookingId'],
    session: ClientSession,
  ): Promise<void> {
    const booking = await BookingModel.findOneAndUpdate(
      {
        _id: bookingId,
        status: {
          $in: [
            BookingStatus.CONFIRMED,
            BookingStatus.COMPLETED,
            BookingStatus.CANCELLATION_REQUESTED,
          ],
        },
      },
      { $set: { status: BookingStatus.REFUNDED, cancelledAt: this.now() } },
      { new: false, session },
    )
      .lean<Booking>()
      .exec();
    if (
      booking &&
      booking.status !== BookingStatus.COMPLETED &&
      booking.status !== BookingStatus.REFUNDED
    ) {
      await TourDeparture.updateOne(
        { _id: booking.departureId, reservedSeats: { $gte: booking.travelers } },
        { $inc: { reservedSeats: -booking.travelers } },
        { session },
      ).exec();
    }
  }

  private assertIntentMatchesPayment(intent: Stripe.PaymentIntent, payment: Payment): void {
    if (
      intent.amount !== payment.amountCents ||
      intent.currency.toUpperCase() !== payment.currency ||
      (intent.status === 'succeeded' && intent.amount_received < payment.amountCents)
    ) {
      throw new AppError(
        HttpCode.CONFLICT,
        ErrorCode.PAYMENT_AMOUNT_MISMATCH,
        'The provider payment amount does not match the booking.',
      );
    }
    const metadataBookingId = intent.metadata.bookingId;
    if (metadataBookingId && metadataBookingId !== payment.bookingId.toString()) {
      throw new AppError(
        HttpCode.CONFLICT,
        ErrorCode.PAYMENT_AMOUNT_MISMATCH,
        'The provider payment does not match the booking.',
      );
    }
  }

  private async recordEventOnly(
    payment: Payment,
    eventId: string,
    session: ClientSession,
  ): Promise<void> {
    await PaymentModel.updateOne(
      { _id: payment._id, processedEventIds: { $ne: eventId } },
      { $addToSet: { processedEventIds: eventId } },
      { session },
    ).exec();
  }

  private async writeSystemAudit(
    action: string,
    paymentId: string,
    context: RequestContext,
    session: ClientSession,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await AuditLog.create(
      [
        {
          actorType: AuditActorType.SYSTEM,
          action,
          entityType: 'payment',
          entityId: paymentId,
          requestId: context.requestId,
          ipAddress: context.ipAddress,
          metadata,
        },
      ],
      { session },
    );
  }

  private async writeMemberAudit(
    auth: AuthContext,
    action: string,
    paymentId: string,
    context: RequestContext,
    session: ClientSession,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await AuditLog.create(
      [
        {
          actorType: AuditActorType.MEMBER,
          actorId: auth.memberId,
          action,
          entityType: 'payment',
          entityId: paymentId,
          requestId: context.requestId,
          ipAddress: context.ipAddress,
          metadata,
        },
      ],
      { session },
    );
  }
}

export default PaymentService;
