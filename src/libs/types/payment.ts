import type { Types } from 'mongoose';
import type { PaymentProvider, PaymentStatus } from '../enums/payment.enum';

export interface Payment {
  _id: Types.ObjectId;
  bookingId: Types.ObjectId;
  provider: PaymentProvider;
  providerIntentId: string;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  failureCode?: string;
  failureMessage?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentIntentInput {
  bookingId: Types.ObjectId;
  idempotencyKey: string;
}
