/* One-off migration for the removal of the booking hold expiry.
 *
 * Bookings used to move to an EXPIRED status once their payment hold ran out,
 * which also handed their seats back to the departure. That status is gone, so
 * any booking still carrying it would sit on a value the enum no longer knows
 * and would stay invisible to its owner. Put those bookings back where they
 * were before the sweep touched them, reserve their seats again, and clear the
 * field and index the expiry left behind.
 *
 * Safe to run more than once: after the first pass there is nothing left to
 * match. Run it without --apply first to see what it would do.
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { logger } from '../src/config/logger';
import { BookingStatus } from '../src/libs/enums/booking.enum';
import Booking from '../src/schema/Booking.model';
import TourDeparture from '../src/schema/TourDeparture.model';

const LEGACY_EXPIRED_STATUS = 'EXPIRED';
const apply = process.argv.includes('--apply');

interface ExpiredBooking {
  _id: mongoose.Types.ObjectId;
  departureId: mongoose.Types.ObjectId;
  travelers: number;
}

async function restoreExpiredBookings(): Promise<void> {
  await mongoose.connect(env.MONGO_URL);

  const expired = await Booking.find({ status: LEGACY_EXPIRED_STATUS })
    .select({ _id: 1, departureId: 1, travelers: 1 })
    .lean<ExpiredBooking[]>()
    .exec();

  // Seats are checked per departure rather than per booking: several bookings
  // can point at the same departure, and together they may not fit.
  const seatsByDeparture = new Map<string, number>();
  for (const booking of expired) {
    const key = booking.departureId.toString();
    seatsByDeparture.set(key, (seatsByDeparture.get(key) ?? 0) + booking.travelers);
  }

  const overbooked: Array<{ departureId: string; needed: number; free: number }> = [];
  for (const [departureId, seats] of seatsByDeparture) {
    const departure = await TourDeparture.findById(departureId)
      .select({ capacity: 1, reservedSeats: 1 })
      .lean<{ capacity: number; reservedSeats: number } | null>()
      .exec();
    if (!departure) continue;
    const free = departure.capacity - departure.reservedSeats;
    if (seats > free) overbooked.push({ departureId, needed: seats, free });
  }

  if (overbooked.length > 0) {
    logger.error(
      { overbooked },
      'Refusing to restore: a departure no longer has room for its bookings',
    );
    process.exitCode = 1;
    return;
  }

  if (!apply) {
    logger.info(
      {
        bookings: expired.length,
        departures: seatsByDeparture.size,
        seats: [...seatsByDeparture.values()].reduce((total, seats) => total + seats, 0),
      },
      'Dry run: re-run with --apply to write these changes',
    );
    return;
  }

  await mongoose.connection.transaction(async (session) => {
    await Booking.updateMany(
      { status: LEGACY_EXPIRED_STATUS },
      { $set: { status: BookingStatus.PENDING_PAYMENT } },
      { session },
    ).exec();
    for (const [departureId, seats] of seatsByDeparture) {
      await TourDeparture.updateOne(
        { _id: departureId },
        { $inc: { reservedSeats: seats } },
        { session },
      ).exec();
    }
    await Booking.updateMany({}, { $unset: { holdExpiresAt: '' } }, { session }).exec();
  });

  // The schema no longer declares holdExpiresAt, so its index is dead weight
  // that createIndexes() will never remove on its own.
  const indexes = await Booking.collection.indexes();
  const staleIndex = indexes.find((index) => 'holdExpiresAt' in index.key);
  if (staleIndex?.name) await Booking.collection.dropIndex(staleIndex.name);

  logger.info(
    {
      restored: expired.length,
      departures: seatsByDeparture.size,
      droppedIndex: staleIndex?.name ?? null,
    },
    'Cavora booking hold cleanup completed',
  );
}

void restoreExpiredBookings()
  .catch((err: unknown) => {
    logger.error({ err }, 'Cavora booking hold cleanup failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
