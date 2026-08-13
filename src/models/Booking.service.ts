import { randomBytes } from 'node:crypto';
import mongoose, { type ClientSession } from 'mongoose';
import { AppError } from '../common/errors/app-error';
import { ErrorCode, HttpCode } from '../common/errors/error-codes';
import { AuditActorType } from '../libs/enums/audit.enum';
import { BookingStatus } from '../libs/enums/booking.enum';
import { TourDepartureStatus, TourStatus } from '../libs/enums/tour.enum';
import type { Booking, BookingHoldInput, BookingView } from '../libs/types/booking';
import type { AuthContext, RequestContext } from '../libs/types/member';
import AuditLog from '../schema/AuditLog.model';
import BookingModel from '../schema/Booking.model';
import Tour from '../schema/Tour.model';
import TourDeparture from '../schema/TourDeparture.model';

function toBookingView(booking: Booking): BookingView {
  return {
    id: booking._id.toString(),
    reference: booking.reference,
    tourId: booking.tourId,
    departureId: booking.departureId.toString(),
    status: booking.status,
    travelers: booking.travelers,
    unitPriceCents: booking.unitPriceCents,
    subtotalCents: booking.subtotalCents,
    serviceFeeCents: booking.serviceFeeCents,
    totalCents: booking.totalCents,
    currency: booking.currency,
    ...(booking.confirmedAt ? { confirmedAt: booking.confirmedAt.toISOString() } : {}),
    ...(booking.cancelledAt ? { cancelledAt: booking.cancelledAt.toISOString() } : {}),
    createdAt: booking.createdAt.toISOString(),
  };
}

function bookingNotFound(): AppError {
  return new AppError(HttpCode.NOT_FOUND, ErrorCode.BOOKING_NOT_FOUND, 'Booking not found.');
}

class BookingService {
  public constructor(private readonly now: () => Date = () => new Date()) {}

  public async createBookingHold(
    auth: AuthContext,
    input: BookingHoldInput,
    context: RequestContext,
  ): Promise<BookingView> {
    return mongoose.connection.transaction(async (session) => {
      const now = this.now();
      const tourExists = await Tour.exists({
        _id: input.tourId,
        status: TourStatus.PUBLISHED,
      }).session(session);
      if (!tourExists) {
        throw new AppError(HttpCode.NOT_FOUND, ErrorCode.TOUR_NOT_FOUND, 'Tour not found.');
      }

      const departure = await TourDeparture.findOneAndUpdate(
        {
          _id: input.departureId,
          tourId: input.tourId,
          status: TourDepartureStatus.SCHEDULED,
          startDate: { $gte: now },
          $expr: {
            $gte: [{ $subtract: ['$capacity', '$reservedSeats'] }, input.travelers],
          },
        },
        { $inc: { reservedSeats: input.travelers } },
        { new: true, session },
      )
        .lean()
        .exec();
      if (!departure) {
        throw new AppError(
          HttpCode.CONFLICT,
          ErrorCode.AVAILABILITY_UNAVAILABLE,
          'The selected departure no longer has enough availability.',
        );
      }

      const subtotalCents = departure.priceCents * input.travelers;
      const serviceFeeCents = Math.round(subtotalCents * 0.02);
      const [booking] = await BookingModel.create(
        [
          {
            reference:
              `CAV-${now.getTime().toString(36)}-${randomBytes(4).toString('hex')}`.toUpperCase(),
            memberId: auth.memberId,
            tourId: input.tourId,
            departureId: departure._id,
            status: BookingStatus.PENDING_PAYMENT,
            travelers: input.travelers,
            unitPriceCents: departure.priceCents,
            subtotalCents,
            serviceFeeCents,
            totalCents: subtotalCents + serviceFeeCents,
            currency: departure.currency,
          },
        ],
        { session },
      );
      if (!booking) throw new Error('Booking creation returned no document.');
      await this.writeAudit(auth, 'booking.hold_created', booking._id.toString(), context, session);
      return toBookingView(booking.toObject());
    });
  }

  public async getBooking(auth: AuthContext, bookingId: string): Promise<BookingView> {
    const booking = await BookingModel.findOne({
      _id: bookingId,
      memberId: auth.memberId,
    })
      .lean<Booking>()
      .exec();
    if (!booking) throw bookingNotFound();
    return toBookingView(booking);
  }

  public async cancelBooking(
    auth: AuthContext,
    bookingId: string,
    context: RequestContext,
  ): Promise<BookingView> {
    return mongoose.connection.transaction(async (session) => {
      const booking = await BookingModel.findOne({
        _id: bookingId,
        memberId: auth.memberId,
      })
        .session(session)
        .lean<Booking>()
        .exec();
      if (!booking) throw bookingNotFound();

      if (booking.status === BookingStatus.PENDING_PAYMENT) {
        const cancelledAt = this.now();
        const cancellation = await BookingModel.updateOne(
          { _id: booking._id, status: BookingStatus.PENDING_PAYMENT },
          { $set: { status: BookingStatus.CANCELLED, cancelledAt } },
          { session },
        ).exec();
        if (cancellation.modifiedCount === 0) {
          throw new AppError(
            HttpCode.CONFLICT,
            ErrorCode.INVALID_BOOKING_STATE,
            'The booking state changed before cancellation completed.',
          );
        }
        await TourDeparture.updateOne(
          { _id: booking.departureId, reservedSeats: { $gte: booking.travelers } },
          { $inc: { reservedSeats: -booking.travelers } },
          { session },
        ).exec();
        booking.status = BookingStatus.CANCELLED;
        booking.cancelledAt = cancelledAt;
      } else if (booking.status === BookingStatus.CONFIRMED) {
        const cancellation = await BookingModel.updateOne(
          { _id: booking._id, status: BookingStatus.CONFIRMED },
          { $set: { status: BookingStatus.CANCELLATION_REQUESTED } },
          { session },
        ).exec();
        if (cancellation.modifiedCount === 0) {
          throw new AppError(
            HttpCode.CONFLICT,
            ErrorCode.INVALID_BOOKING_STATE,
            'The booking state changed before cancellation completed.',
          );
        }
        booking.status = BookingStatus.CANCELLATION_REQUESTED;
      } else {
        throw new AppError(
          HttpCode.CONFLICT,
          ErrorCode.INVALID_BOOKING_STATE,
          `A booking in ${booking.status} state cannot be cancelled.`,
        );
      }

      await this.writeAudit(
        auth,
        'booking.cancellation_requested',
        booking._id.toString(),
        context,
        session,
      );
      return toBookingView(booking);
    });
  }

  private async writeAudit(
    auth: AuthContext,
    action: string,
    entityId: string,
    context: RequestContext,
    session: ClientSession,
  ): Promise<void> {
    await AuditLog.create(
      [
        {
          actorType: AuditActorType.MEMBER,
          actorId: auth.memberId,
          action,
          entityType: 'booking',
          entityId,
          requestId: context.requestId,
          ipAddress: context.ipAddress,
        },
      ],
      { session },
    );
  }
}

export default BookingService;
