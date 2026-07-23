import type { Types } from 'mongoose';
import type { TourSummary } from './tour';

export interface Wishlist {
  _id: Types.ObjectId;
  memberId: Types.ObjectId;
  tourId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WishlistInput {
  memberId: Types.ObjectId;
  tourId: number;
}

export interface WishlistResult {
  data: TourSummary[];
}
