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
import Faq from './schema/Faq.model';
import Member from './schema/Member.model';
import NewsletterSubscriber from './schema/NewsletterSubscriber.model';
import PasswordResetToken from './schema/PasswordResetToken.model';
import Payment from './schema/Payment.model';
import Session from './schema/Session.model';
import Tour from './schema/Tour.model';
import TourDeparture from './schema/TourDeparture.model';
import TourImage from './schema/TourImage.model';
import TourView from './schema/TourView.model';
import Wishlist from './schema/Wishlist.model';
import rawBlogSeedData from './data/blog.seed.json';
import rawFaqSeedData from './data/faq.seed.json';
import rawSeedData from './data/tours.seed.json';
import type { FaqSection, FaqStatus } from './libs/enums/faq.enum';

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

interface SeedFaq {
  sourceKey: string;
  section: FaqSection;
  question: string;
  answer: string;
  position: number;
  status: FaqStatus;
}

interface FaqSeedData {
  faqs: SeedFaq[];
}

const seedData = rawSeedData as TourSeedData;
const blogSeedData = rawBlogSeedData as BlogSeedData;
const faqSeedData = rawFaqSeedData as FaqSeedData;
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
const tourCommentTemplates = [
  'The itinerary felt thoughtfully paced, with enough time to enjoy each stop.',
  'Our guide made the local history easy to understand and genuinely memorable.',
  'The booking details matched the experience, and every transfer ran smoothly.',
  'I would recommend this tour to travelers visiting the destination for the first time.',
  'The small-group format made the journey feel relaxed and personal.',
  'The scenery was even better in person, especially during the quieter morning stops.',
  'A well-organized experience with a great balance of culture, food, and free time.',
];
const indexedModels: Model<unknown>[] = [
  Member,
  NewsletterSubscriber,
  Session,
  PasswordResetToken,
  EmailVerificationToken,
  Tour,
  TourImage,
  TourView,
  TourDeparture,
  Wishlist,
  Booking,
  Payment,
  BlogPost,
  BlogComment,
  ContactMessage,
  Faq,
  AuditLog,
] as Model<unknown>[];

async function seed(): Promise<void> {
  await mongoose.connect(env.MONGO_URL);

  await Promise.all(indexedModels.map((databaseModel) => databaseModel.createIndexes()));
  await Tour.bulkWrite(
    seedData.tours.map((tour) => ({
      updateOne: {
        filter: { _id: tour._id },
        update: {
          $set: { ...tour, publishedAt: new Date(tour.publishedAt) },
          $setOnInsert: {
            viewCount: 240 + tour.reviewCount * 11 + (tour._id % 7) * 73,
          },
        },
        upsert: true,
      },
    })),
  );
  await Tour.bulkWrite(
    seedData.tours.map((tour) => ({
      updateOne: {
        filter: { _id: tour._id, viewCount: { $exists: false } },
        update: { $set: { viewCount: 240 + tour.reviewCount * 11 + (tour._id % 7) * 73 } },
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

  const tourCommentOperations = seedData.tours.flatMap((tour) =>
    Array.from({ length: 7 }, (_, index) => {
      const name = commentAuthors[(tour._id + index * 2) % commentAuthors.length] as string;
      const email = `demo-tour-${tour._id}-comment-${index + 1}@example.com`;
      return {
        updateOne: {
          filter: { tourId: tour._id, email },
          update: {
            $set: {
              name,
              body: tourCommentTemplates[index] as string,
              status: BlogCommentStatus.APPROVED,
            },
            $setOnInsert: { tourId: tour._id, email },
          },
          upsert: true,
        },
      };
    }),
  );
  await BlogComment.bulkWrite(tourCommentOperations);

  await Faq.bulkWrite(
    faqSeedData.faqs.map((faq) => ({
      updateOne: {
        filter: { sourceKey: faq.sourceKey },
        update: { $setOnInsert: faq },
        upsert: true,
      },
    })),
  );

  const legacyDepartureFilters = seedData.tours.flatMap((tour) =>
    Array.from({ length: 18 }, (_, monthIndex) => ({
      tourId: tour._id,
      startDate: new Date(
        Date.UTC(2026, 8 + monthIndex, 4 + ((tour._id * 3 + monthIndex * 5) % 20)),
      ),
    })),
  );
  const bookedDepartureIds = await Booking.distinct('departureId').exec();
  const legacyDepartureCleanup = await TourDeparture.deleteMany({
    $or: legacyDepartureFilters,
    ...(bookedDepartureIds.length ? { _id: { $nin: bookedDepartureIds } } : {}),
  }).exec();

  const departureOperations = seedData.tours.flatMap((tour) =>
    Array.from({ length: 18 }, (_, monthIndex) => {
      const departuresInMonth = 3 + ((tour._id + monthIndex) % 2);
      const firstBookableDay = monthIndex === 0 ? 14 : 3;
      const bookableDayRange = monthIndex === 0 ? 16 : 25;

      return Array.from({ length: departuresInMonth }, (_, departureIndex) => {
        const day =
          firstBookableDay +
          ((tour._id * 7 + monthIndex * 5 + departureIndex * 7) % bookableDayRange);
        const startDate = new Date(Date.UTC(2026, 7 + monthIndex, day, 9));
        const seasonalRate = 1 + ((tour._id + monthIndex + departureIndex) % 5) * 0.03;

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
      });
    }).flat(),
  );
  await TourDeparture.bulkWrite(departureOperations);

  logger.info(
    {
      blogComments: commentOperations.length,
      tourComments: tourCommentOperations.length,
      blogPosts: blogSeedData.posts.length,
      faqs: faqSeedData.faqs.length,
      legacyTourDeparturesRemoved: legacyDepartureCleanup.deletedCount,
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
