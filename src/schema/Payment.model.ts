import { model, Schema } from 'mongoose';
import { PaymentProvider, PaymentStatus } from '../libs/enums/payment.enum';
import type { Payment } from '../libs/types/payment';

const paymentSchema = new Schema<Payment>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
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
paymentSchema.index({ bookingId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

export default model<Payment>('Payment', paymentSchema);
