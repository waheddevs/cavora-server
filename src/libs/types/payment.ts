import type { Types } from 'mongoose';
import type { PaymentProvider, PaymentStatus } from '../enums/payment.enum';

export interface Payment {
  _id: Types.ObjectId;
  bookingId: Types.ObjectId;
  idempotencyKey: string;
  provider: PaymentProvider;
  providerIntentId: string;
  providerRefundIds: string[];
  processedEventIds: string[];
  settledRefundIds: string[];
  status: PaymentStatus;
  amountCents: number;
  pendingRefundAmountCents: number;
  refundedAmountCents: number;
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

export interface PaymentIntentResult {
  id: string;
  bookingId: string;
  providerIntentId: string;
  clientSecret: string;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
}

export interface PaymentRefundInput {
  paymentId: Types.ObjectId;
  idempotencyKey: string;
  amountCents?: number;
}

export interface PaymentRefundResult {
  id: string;
  paymentId: string;
  status: PaymentStatus;
  amountCents: number;
}

export interface PaymentInquiry {
  limit: number;
  page: number;
  query?: string;
  status?: PaymentStatus;
}

export interface AdminPaymentView {
  id: string;
  bookingId: string;
  providerIntentId: string;
  status: PaymentStatus;
  amountCents: number;
  pendingRefundAmountCents: number;
  refundedAmountCents: number;
  currency: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StripeWebhookResult {
  received: true;
}
