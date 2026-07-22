import type { Types } from 'mongoose';
import type { BookingStatus } from '../enums/booking.enum';

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
  holdExpiresAt: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingHoldInput {
  tourId: number;
  departureId: Types.ObjectId;
  travelers: number;
}

export interface BookingInquiry {
  page: number;
  limit: number;
  status?: BookingStatus;
}
