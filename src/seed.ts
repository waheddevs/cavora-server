import mongoose, { type Model } from 'mongoose';
import { env } from './config/env';
import { logger } from './config/logger';
import type { TourStatus } from './libs/enums/tour.enum';
import AuditLog from './schema/AuditLog.model';
import BlogComment from './schema/BlogComment.model';
import BlogPost from './schema/BlogPost.model';
import Booking from './schema/Booking.model';
import ContactMessage from './schema/ContactMessage.model';
import EmailVerificationToken from './schema/EmailVerificationToken.model';
import Member from './schema/Member.model';
import PasswordResetToken from './schema/PasswordResetToken.model';
import Payment from './schema/Payment.model';
import Session from './schema/Session.model';
import Tour from './schema/Tour.model';
import TourDeparture from './schema/TourDeparture.model';
import TourImage from './schema/TourImage.model';
import Wishlist from './schema/Wishlist.model';
import rawSeedData from './data/tours.seed.json';

interface SeedTour {
  _id: number;
  slug: string;
  country: string;
  place: string;
  title: string;
  location: string;
  type: string;
  priceCents: number;
  oldPriceCents: number;
  currency: string;
  ratingAverage: number;
  reviewCount: number;
  durationDays: number;
  maxGroupSize: number;
  overview: string;
  highlights: string[];
  itinerary: Array<{ day: number; title: string; description: string }>;
  included: string[];
  notIncluded: string[];
  status: TourStatus;
  featuredRank?: number;
  popularityRank?: number;
  publishedAt: string;
}

interface SeedTourImage {
  tourId: number;
  url: string;
  altText: string;
  position: number;
}

interface TourSeedData {
  tours: SeedTour[];
  tourImages: SeedTourImage[];
}

const seedData = rawSeedData as TourSeedData;
const indexedModels: Model<unknown>[] = [
  Member,
  Session,
  PasswordResetToken,
  EmailVerificationToken,
  Tour,
  TourImage,
  TourDeparture,
  Wishlist,
  Booking,
  Payment,
  BlogPost,
  BlogComment,
  ContactMessage,
  AuditLog,
] as Model<unknown>[];

async function seed(): Promise<void> {
  await mongoose.connect(env.MONGO_URL);

  await Promise.all(indexedModels.map((databaseModel) => databaseModel.createIndexes()));
  await Tour.bulkWrite(
    seedData.tours.map((tour) => ({
      updateOne: {
        filter: { _id: tour._id },
        update: { $set: { ...tour, publishedAt: new Date(tour.publishedAt) } },
        upsert: true,
      },
    })),
  );
  await TourImage.bulkWrite(
    seedData.tourImages.map((image) => ({
      updateOne: {
        filter: { tourId: image.tourId, position: image.position },
        update: { $set: image },
        upsert: true,
      },
    })),
  );

  logger.info(
    { tours: seedData.tours.length, tourImages: seedData.tourImages.length },
    'Cavora seed completed',
  );
}

void seed()
  .catch((err: unknown) => {
    logger.error({ err }, 'Cavora seed failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
