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
  amountCents: number;
  bookingId: string;
  clientSecret: string;
  currency: string;
  id: string;
  providerIntentId: string;
  status: PaymentStatus;
}

export interface PaymentRefundInput {
  amountCents?: number;
  idempotencyKey: string;
  paymentId: Types.ObjectId;
}

export interface PaymentRefundResult {
  amountCents: number;
  id: string;
  paymentId: string;
  status: PaymentStatus;
}

export interface PaymentInquiry {
  limit: number;
  page: number;
  query?: string;
  status?: PaymentStatus;
}

export interface AdminPaymentView {
  amountCents: number;
  bookingId: string;
  createdAt: string;
  currency: string;
  id: string;
  paidAt?: string;
  pendingRefundAmountCents: number;
  providerIntentId: string;
  refundedAmountCents: number;
  status: PaymentStatus;
  updatedAt: string;
}

export interface StripeWebhookResult {
  received: true;
}
