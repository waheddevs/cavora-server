import mongoose, { type Model } from 'mongoose';
import { env } from './config/env';
import { logger } from './config/logger';
import { BlogCommentStatus, type BlogPostStatus } from './libs/enums/blog.enum';
import { TourDepartureStatus, type TourStatus } from './libs/enums/tour.enum';
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
import rawBlogSeedData from './data/blog.seed.json';
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

interface SeedBlogPost {
  sourceId: number;
  slug: string;
  title: string;
  excerpt: string;
  body: unknown;
  category: string;
  imageUrl: string;
  authorName: string;
  authorImageUrl: string;
  status: BlogPostStatus;
  publishedAt: string;
  commentCount: number;
}

interface BlogSeedData {
  posts: SeedBlogPost[];
}

const seedData = rawSeedData as TourSeedData;
const blogSeedData = rawBlogSeedData as BlogSeedData;
const commentAuthors = [
  'Emily Watson',
  'Daniel Kim',
  'Amara Diallo',
  'Lucas Martin',
  'Maya Patel',
  'Noah Williams',
  'Sofia Garcia',
  'Ethan Brown',
  'Ava Thompson',
  'Leo Chen',
  'Isabella Rossi',
  'Omar Hassan',
];
const commentTemplates = [
  'This story immediately made me want to add {category} travel to my next itinerary.',
  'The practical details were genuinely useful. I am saving this before planning my trip.',
  'Beautifully written and full of the small observations that make travel memorable.',
  'I visited a similar place last year and this brought back so many great memories.',
  'The advice about keeping part of the itinerary flexible is absolutely right.',
  'This is exactly the kind of thoughtful travel guide I was looking for.',
  'I shared this with my travel group and now everyone wants to plan the journey.',
  'The photos and storytelling make the destination feel incredibly vivid.',
  'A very helpful read for anyone visiting this destination for the first time.',
  'I would love a follow-up article with even more local food recommendations.',
];
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

  await BlogPost.bulkWrite(
    blogSeedData.posts.map(({ commentCount: _commentCount, sourceId: _sourceId, ...post }) => ({
      updateOne: {
        filter: { slug: post.slug },
        update: { $set: { ...post, publishedAt: new Date(post.publishedAt) } },
        upsert: true,
      },
    })),
  );

  const seededPosts = await BlogPost.find({
    slug: { $in: blogSeedData.posts.map((post) => post.slug) },
  })
    .select({ _id: 1, slug: 1 })
    .lean()
    .exec();
  const postIdsBySlug = new Map(seededPosts.map((post) => [post.slug, post._id]));
  const commentOperations = blogSeedData.posts.flatMap((post) => {
    const postId = postIdsBySlug.get(post.slug);
    if (!postId) throw new Error(`Seeded blog post not found for slug: ${post.slug}`);

    return Array.from({ length: post.commentCount }, (_, index) => {
      const name = commentAuthors[(post.sourceId + index) % commentAuthors.length] as string;
      const template = commentTemplates[index % commentTemplates.length] as string;
      const body = template.replace('{category}', post.category.toLowerCase());
      const email = `demo-post-${post.sourceId}-comment-${index + 1}@example.com`;

      return {
        updateOne: {
          filter: { postId, email },
          update: {
            $set: {
              name,
              body,
              status: BlogCommentStatus.APPROVED,
            },
            $setOnInsert: { postId, email },
          },
          upsert: true,
        },
      };
    });
  });
  await BlogComment.bulkWrite(commentOperations);

  const departureOperations = seedData.tours.flatMap((tour) =>
    Array.from({ length: 18 }, (_, index) => {
      const startDate = new Date(Date.UTC(2026, 8 + index, 4 + ((tour._id * 3 + index * 5) % 20)));
      const seasonalRate = 1 + ((tour._id + index) % 5) * 0.03;

      return {
        updateOne: {
          filter: { tourId: tour._id, startDate },
          update: {
            $setOnInsert: {
              tourId: tour._id,
              startDate,
              capacity: Math.max(tour.maxGroupSize * 3, 18),
              reservedSeats: 0,
              priceCents: Math.round(tour.priceCents * seasonalRate),
              currency: tour.currency,
              status: TourDepartureStatus.SCHEDULED,
            },
          },
          upsert: true,
        },
      };
    }),
  );
  await TourDeparture.bulkWrite(departureOperations);

  logger.info(
    {
      blogComments: commentOperations.length,
      blogPosts: blogSeedData.posts.length,
      tourDepartures: departureOperations.length,
      tourImages: seedData.tourImages.length,
      tours: seedData.tours.length,
    },
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
