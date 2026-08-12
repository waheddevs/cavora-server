import type { Types } from 'mongoose';
import type { FaqSection, FaqStatus } from '../enums/faq.enum';
import type { PaginationMeta } from './tour';

export interface Faq {
  _id: Types.ObjectId;
  sourceKey?: string;
  section: FaqSection;
  question: string;
  answer: string;
  position: number;
  status: FaqStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface FaqInput {
  section: FaqSection;
  question: string;
  answer: string;
  position: number;
  status: FaqStatus;
}

export interface FaqUpdateInput extends Partial<FaqInput> {
  _id: Types.ObjectId;
}

export interface FaqInquiry {
  limit: number;
  page: number;
  query?: string;
  section?: FaqSection;
  status?: FaqStatus;
}

export interface FaqView {
  id: string;
  section: FaqSection;
  sectionTitle: string;
  question: string;
  answer: string;
  position: number;
  status: FaqStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PublicFaqItem {
  id: string;
  question: string;
  answer: string;
  position: number;
}

export interface PublicFaqSection {
  section: FaqSection;
  title: string;
  items: PublicFaqItem[];
}

export interface PaginatedAdminFaqs {
  data: FaqView[];
  meta: PaginationMeta;
}
