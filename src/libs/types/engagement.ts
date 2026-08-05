import type { Types } from 'mongoose';
import type { ContactMessageStatus } from '../enums/engagement.enum';
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

export interface ContactMessageView {
  id: string;
  memberId?: string;
  fullName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  resolvedAt?: string;
  createdAt: string;
}

export interface ContactMessageInquiry {
  limit: number;
  page: number;
  query?: string;
  status?: ContactMessageStatus;
}

export interface PaginatedContactMessages {
  data: ContactMessageView[];
  meta: PaginationMeta;
}
