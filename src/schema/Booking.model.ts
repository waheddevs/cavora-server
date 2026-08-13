import mongoose, { Schema } from 'mongoose';
import { BookingStatus } from '../libs/enums/booking.enum';
import type { Booking } from '../libs/types/booking';

const bookingSchema = new Schema<Booking>(
  {
    reference: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 40,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    tourId: {
      type: Number,
      ref: 'Tour',
      required: true,
      min: 1,
    },
    departureId: {
      type: Schema.Types.ObjectId,
      ref: 'TourDeparture',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING_PAYMENT,
    },
    travelers: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPriceCents: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotalCents: {
      type: Number,
      required: true,
      min: 0,
    },
    serviceFeeCents: {
      type: Number,
      required: true,
      min: 0,
    },
    totalCents: {
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
    confirmedAt: Date,
    cancelledAt: Date,
    memberArchivedAt: Date,
  },
  { timestamps: true, collection: 'bookings' },
);

bookingSchema.index({ reference: 1 }, { unique: true });
bookingSchema.index({ memberId: 1, status: 1, createdAt: -1 });
bookingSchema.index({ memberId: 1, memberArchivedAt: 1, status: 1, createdAt: -1 });
bookingSchema.index({ departureId: 1, status: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<Booking>('Booking', bookingSchema);
