import type { Types } from 'mongoose';
import type { ContactMessageStatus, NewsletterSubscriptionStatus } from '../enums/engagement.enum';

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
