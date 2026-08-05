import type { Types } from 'mongoose';
import type { TourDepartureStatus, TourStatus } from '../enums/tour.enum';

export interface TourItineraryItem {
  day: number;
  title: string;
  description: string;
}

export interface Tour {
  _id: number;
  slug: string;
  country: string;
  place: string;
  title: string;
  location: string;
  type: string;
  priceCents: number;
  oldPriceCents?: number;
  currency: string;
  ratingAverage: number;
  reviewCount: number;
  durationDays: number;
  maxGroupSize: number;
  overview: string;
  highlights: string[];
  itinerary: TourItineraryItem[];
  included: string[];
  notIncluded: string[];
  status: TourStatus;
  featuredRank?: number;
  popularityRank?: number;
  homepageSpotlight?: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TourInput = Omit<Tour, 'createdAt' | 'updatedAt'>;

export interface TourUpdateInput extends Partial<Omit<TourInput, '_id'>> {
  _id: number;
}

export interface TourInquiry {
  page: number;
  limit: number;
  query?: string;
  destination?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  duration?: 'short' | 'medium' | 'long';
  minRating?: number;
  sort?: 'price-asc' | 'price-desc' | 'rating' | 'duration' | 'popularity';
}

export interface TourImage {
  _id: Types.ObjectId;
  tourId: number;
  url: string;
  altText: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TourDeparture {
  _id: Types.ObjectId;
  tourId: number;
  startDate: Date;
  capacity: number;
  reservedSeats: number;
  priceCents: number;
  currency: string;
  status: TourDepartureStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilityInquiry {
  tourId: number;
  travelers: number;
  from?: Date;
  to?: Date;
}

export interface TourImageView {
  url: string;
  altText: string;
  position: number;
}

export interface TourSummary {
  id: number;
  slug: string;
  country: string;
  place: string;
  title: string;
  location: string;
  type: string;
  priceCents: number;
  oldPriceCents?: number;
  currency: string;
  ratingAverage: number;
  reviewCount: number;
  durationDays: number;
  maxGroupSize: number;
  images: TourImageView[];
}

export interface TourDetail extends TourSummary {
  overview: string;
  highlights: string[];
  itinerary: TourItineraryItem[];
  included: string[];
  notIncluded: string[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedTours {
  data: TourSummary[];
  meta: PaginationMeta;
}

export interface AvailableDeparture {
  id: Types.ObjectId;
  startDate: Date;
  availableSeats: number;
  priceCents: number;
  currency: string;
}

export interface AvailabilityResult {
  tourId: number;
  travelers: number;
  departures: AvailableDeparture[];
}

export interface TourImageInput {
  tourId: number;
  url: string;
  altText: string;
  position: number;
}

export interface TourImageWriteInput extends Omit<TourImageInput, 'url'> {
  url?: string;
}

export interface TourDepartureInput {
  tourId: number;
  startDate: Date;
  capacity: number;
  priceCents: number;
  currency: string;
  status: TourDepartureStatus;
}

export interface TourDepartureUpdateInput extends Partial<Omit<TourDepartureInput, 'tourId'>> {
  _id: Types.ObjectId;
}

export interface HomepageSelectionsInput {
  featuredTourIds: number[];
  popularTourIds: number[];
  spotlightTourId: number;
}

export type HomepageSelectionsResult = HomepageSelectionsInput;

export interface HomepageSelectionsView {
  featuredTourIds: number[];
  popularTourIds: number[];
  spotlightTourId?: number;
}

export interface AdminTourView extends Omit<
  Tour,
  '_id' | 'createdAt' | 'publishedAt' | 'updatedAt'
> {
  id: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTourDepartureView extends Omit<
  TourDeparture,
  '_id' | 'createdAt' | 'startDate' | 'updatedAt'
> {
  id: string;
  startDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTourImageView extends TourImageView {
  id: string;
  tourId: number;
}

export interface AdminTourInquiry {
  limit: number;
  page: number;
  query?: string;
  status?: TourStatus;
  type?: string;
}

export interface AdminTourDetail extends AdminTourView {
  images: AdminTourImageView[];
}

export interface AdminDepartureInquiry {
  from?: Date;
  limit: number;
  page: number;
  status?: TourDepartureStatus;
  tourId?: number;
}

export interface PaginatedAdminTours {
  data: AdminTourView[];
  meta: PaginationMeta;
}

export interface PaginatedAdminDepartures {
  data: AdminTourDepartureView[];
  meta: PaginationMeta;
}
