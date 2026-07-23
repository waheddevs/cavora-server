import mongoose, { Schema } from 'mongoose';
import { TourDepartureStatus } from '../libs/enums/tour.enum';
import type { TourDeparture } from '../libs/types/tour';

const tourDepartureSchema = new Schema<TourDeparture>(
  {
    tourId: {
      type: Number,
      ref: 'Tour',
      required: true,
      min: 1,
    },
    startDate: {
      type: Date,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    reservedSeats: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    priceCents: {
      type: Number,
      required: true,
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
    status: {
      type: String,
      enum: Object.values(TourDepartureStatus),
      default: TourDepartureStatus.SCHEDULED,
    },
  },
  { timestamps: true, collection: 'tour_departures' },
);

tourDepartureSchema.index({ tourId: 1, startDate: 1, status: 1 });
tourDepartureSchema.index({ status: 1, startDate: 1 });

export default mongoose.model<TourDeparture>('TourDeparture', tourDepartureSchema);
