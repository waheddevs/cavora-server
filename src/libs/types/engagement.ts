import type { Types } from 'mongoose';
import type { ContactMessageStatus, NewsletterSubscriptionStatus } from '../enums/engagement.enum';
import type { PaginationMeta } from './tour';

export interface ContactMessage {
  _id: Types.ObjectId;
  memberId?: Types.ObjectId;
  fullName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactMessageInput {
  memberId?: Types.ObjectId;
  fullName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface NewsletterSubscription {
  _id: Types.ObjectId;
  email: string;
  status: NewsletterSubscriptionStatus;
  source: string;
  consentedAt: Date;
  confirmedAt?: Date;
  unsubscribeTokenHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewsletterSubscriptionInput {
  email: string;
  source: string;
  unsubscribeTokenHash: string;
}

export interface ContactMessageView {
  createdAt: string;
  email: string;
  fullName: string;
  id: string;
  memberId?: string;
  message: string;
  phone?: string;
  resolvedAt?: string;
  status: ContactMessageStatus;
  subject: string;
}

export interface NewsletterSubscriptionView {
  confirmedAt?: string;
  consentedAt: string;
  createdAt: string;
  email: string;
  id: string;
  source: string;
  status: NewsletterSubscriptionStatus;
}

export interface ContactMessageInquiry {
  limit: number;
  page: number;
  query?: string;
  status?: ContactMessageStatus;
}

export interface NewsletterSubscriptionInquiry {
  limit: number;
  page: number;
  query?: string;
  status?: NewsletterSubscriptionStatus;
}

export interface PaginatedContactMessages {
  data: ContactMessageView[];
  meta: PaginationMeta;
}

export interface PaginatedNewsletterSubscriptions {
  data: NewsletterSubscriptionView[];
  meta: PaginationMeta;
}
