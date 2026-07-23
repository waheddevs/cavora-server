import mongoose, { Schema } from 'mongoose';
import type { TourImage } from '../libs/types/tour';

const tourImageSchema = new Schema<TourImage>(
  {
    tourId: {
      type: Number,
      ref: 'Tour',
      required: true,
      min: 1,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2_048,
    },
    altText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    position: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true, collection: 'tour_images' },
);

tourImageSchema.index({ tourId: 1, position: 1 }, { unique: true });

export default mongoose.model<TourImage>('TourImage', tourImageSchema);
