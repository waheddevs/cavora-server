import mongoose, { Schema } from 'mongoose';
import { TourStatus } from '../libs/enums/tour.enum';
import type { Tour, TourItineraryItem } from '../libs/types/tour';

const itineraryItemSchema = new Schema<TourItineraryItem>(
  {
    day: {
      type: Number,
      required: true,
      min: 1,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5_000,
    },
  },
  { _id: false },
);

const tourSchema = new Schema<Tour>(
  {
    _id: {
      type: Number,
      required: true,
      min: 1,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 180,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    place: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    priceCents: {
      type: Number,
      required: true,
      min: 0,
    },
    oldPriceCents: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },
    ratingAverage: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
    },
    maxGroupSize: {
      type: Number,
      required: true,
      min: 1,
    },
    overview: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20_000,
    },
    highlights: {
      type: [String],
      default: [],
    },
    itinerary: {
      type: [itineraryItemSchema],
      default: [],
    },
    included: {
      type: [String],
      default: [],
    },
    notIncluded: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(TourStatus),
      default: TourStatus.DRAFT,
    },
    featuredRank: {
      type: Number,
      min: 1,
    },
    popularityRank: {
      type: Number,
      min: 1,
    },
    homepageSpotlight: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
    },
  },
  { timestamps: true, collection: 'tours' },
);

tourSchema.index({ slug: 1 }, { unique: true });
tourSchema.index({ status: 1, publishedAt: -1 });
tourSchema.index({ status: 1, featuredRank: 1 });
tourSchema.index({ status: 1, popularityRank: 1 });
tourSchema.index({ status: 1, homepageSpotlight: 1 });
tourSchema.index({ status: 1, country: 1, type: 1, priceCents: 1 });
tourSchema.index(
  {
    title: 'text',
    location: 'text',
    country: 'text',
    place: 'text',
  },
  {
    weights: {
      title: 10,
      place: 5,
      location: 3,
      country: 2,
    },
  },
);

export default mongoose.model<Tour>('Tour', tourSchema);
