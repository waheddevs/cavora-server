import type { Types } from 'mongoose';
import type { BookingStatus } from '../enums/booking.enum';
import type { PaginationMeta, TourSummary } from './tour';

export interface Booking {
  _id: Types.ObjectId;
  reference: string;
  memberId: Types.ObjectId;
  tourId: number;
  departureId: Types.ObjectId;
  status: BookingStatus;
  travelers: number;
  unitPriceCents: number;
  subtotalCents: number;
  serviceFeeCents: number;
  totalCents: number;
  currency: string;
  confirmedAt?: Date;
  cancelledAt?: Date;
  memberArchivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingHoldInput {
  tourId: number;
  departureId: Types.ObjectId;
  travelers: number;
}

export interface BookingView {
  id: string;
  reference: string;
  tourId: number;
  departureId: string;
  status: BookingStatus;
  travelers: number;
  unitPriceCents: number;
  subtotalCents: number;
  serviceFeeCents: number;
  totalCents: number;
  currency: string;
  confirmedAt?: string;
  cancelledAt?: string;
  createdAt: string;
}

export interface BookingInquiry {
  page: number;
  limit: number;
  query?: string;
  status?: BookingStatus;
}

export type MemberBookingArchiveGroup = 'past' | 'cancelled';

export interface MemberBookingArchiveInput {
  group: MemberBookingArchiveGroup;
}

export interface MemberBookingArchiveResult {
  archivedCount: number;
}

export interface AdminBookingView extends BookingView {
  memberId: string;
  updatedAt: string;
}

export interface MemberBookingView {
  id: string;
  reference: string;
  tourId: number;
  tour: TourSummary | null;
  departureId: string;
  departureDate?: string;
  status: BookingStatus;
  travelers: number;
  totalCents: number;
  currency: string;
  createdAt: string;
}

export interface MemberBookingHistory {
  data: MemberBookingView[];
  meta: PaginationMeta;
}

export interface AdminBookingStatusInput {
  bookingId: Types.ObjectId;
  status: BookingStatus.CANCELLED | BookingStatus.COMPLETED;
}
