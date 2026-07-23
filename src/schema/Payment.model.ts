import mongoose, { Schema } from 'mongoose';
import { PaymentProvider, PaymentStatus } from '../libs/enums/payment.enum';
import type { Payment } from '../libs/types/payment';

const paymentSchema = new Schema<Payment>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    provider: {
      type: String,
      enum: Object.values(PaymentProvider),
      default: PaymentProvider.STRIPE,
    },
    providerIntentId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    providerRefundIds: {
      type: [String],
      default: [],
    },
    processedEventIds: {
      type: [String],
      default: [],
    },
    settledRefundIds: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.REQUIRES_PAYMENT_METHOD,
    },
    amountCents: {
      type: Number,
      required: true,
      min: 0,
    },
    pendingRefundAmountCents: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundedAmountCents: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },
    failureCode: {
      type: String,
      maxlength: 120,
    },
    failureMessage: {
      type: String,
      maxlength: 1_000,
    },
    paidAt: Date,
  },
  { timestamps: true, collection: 'payments' },
);

paymentSchema.index({ provider: 1, providerIntentId: 1 }, { unique: true });
paymentSchema.index({ bookingId: 1 }, { unique: true });
paymentSchema.index({ idempotencyKey: 1 }, { unique: true });
paymentSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<Payment>('Payment', paymentSchema);
