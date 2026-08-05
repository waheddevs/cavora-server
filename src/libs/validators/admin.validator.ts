import { z } from 'zod';
import { BlogCommentStatus, BlogPostStatus } from '../enums/blog.enum';
import { BookingStatus } from '../enums/booking.enum';
import { ContactMessageStatus } from '../enums/engagement.enum';
import { MemberRole, MemberStatus } from '../enums/member.enum';
import { PaymentStatus } from '../enums/payment.enum';
import { TourDepartureStatus, TourStatus } from '../enums/tour.enum';
import { localOrRemoteUrl, objectId, paginationFields, slug } from './common.validator';

const currency = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Must be a three-letter currency code.');
const pageQuery = paginationFields(20, 100);
const listQuery = z.string().trim().min(1).max(200).optional();
const itineraryItem = z
  .object({
    day: z.number().int().min(1),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(5_000),
  })
  .strict();
const jsonDocument = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}, z.json());
const tourFields = {
  slug,
  country: z.string().trim().min(1).max(100),
  place: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(240),
  type: z.string().trim().min(1).max(80),
  priceCents: z.number().int().min(0),
  oldPriceCents: z.number().int().min(0).optional(),
  currency,
  ratingAverage: z.number().min(0).max(5).default(0),
  reviewCount: z.number().int().min(0).default(0),
  durationDays: z.number().int().min(1),
  maxGroupSize: z.number().int().min(1),
  overview: z.string().trim().min(1).max(20_000),
  highlights: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  itinerary: z.array(itineraryItem).max(100).default([]),
  included: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  notIncluded: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  status: z.enum(TourStatus).default(TourStatus.DRAFT),
  publishedAt: z.coerce.date().optional(),
};
const tourUpdateFields = {
  ...tourFields,
  ratingAverage: z.number().min(0).max(5),
  reviewCount: z.number().int().min(0),
  highlights: z.array(z.string().trim().min(1).max(500)).max(100),
  itinerary: z.array(itineraryItem).max(100),
  included: z.array(z.string().trim().min(1).max(500)).max(100),
  notIncluded: z.array(z.string().trim().min(1).max(500)).max(100),
  status: z.enum(TourStatus),
};
const blogPostFields = {
  slug,
  title: z.string().trim().min(1).max(240),
  excerpt: z.string().trim().min(1).max(1_000),
  body: jsonDocument,
  category: z.string().trim().min(1).max(100),
  imageUrl: localOrRemoteUrl().optional(),
  authorName: z.string().trim().min(1).max(160),
  authorImageUrl: localOrRemoteUrl().optional(),
  status: z.enum(BlogPostStatus).default(BlogPostStatus.DRAFT),
  publishedAt: z.coerce.date().optional(),
};
const blogPostUpdateFields = {
  ...blogPostFields,
  status: z.enum(BlogPostStatus),
};

export const adminObjectIdParamsSchema = z.object({ id: objectId() }).strict();
export const adminTourIdParamsSchema = z
  .object({ id: z.coerce.number().int().positive() })
  .strict();
export const adminTourImageParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    position: z.coerce.number().int().min(0).max(3),
  })
  .strict();

export const adminTourCreateBodySchema = z
  .object({ id: z.number().int().positive(), ...tourFields })
  .strict();
export const adminTourUpdateBodySchema = z
  .object(tourUpdateFields)
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one tour field is required.',
  });
export const adminTourImageBodySchema = z
  .object({
    url: localOrRemoteUrl().optional(),
    altText: z.string().trim().min(1).max(300),
  })
  .strict();

export const adminTourImageUploadBodySchema = z
  .object({
    altText: z.string().trim().min(1).max(300),
  })
  .strict();

export const adminTourListQuerySchema = z
  .object({
    ...pageQuery,
    query: listQuery,
    status: z.enum(TourStatus).optional(),
    type: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

export const adminDepartureCreateBodySchema = z
  .object({
    startDate: z.coerce.date(),
    capacity: z.number().int().min(1),
    priceCents: z.number().int().min(0),
    currency,
    status: z.enum(TourDepartureStatus).default(TourDepartureStatus.SCHEDULED),
  })
  .strict();
export const adminDepartureUpdateBodySchema = adminDepartureCreateBodySchema
  .omit({ status: true })
  .extend({ status: z.enum(TourDepartureStatus).optional() })
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one departure field is required.',
  });
export const adminDepartureListQuerySchema = z
  .object({
    ...pageQuery,
    from: z.coerce.date().optional(),
    status: z.enum(TourDepartureStatus).optional(),
    tourId: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const adminHomepageSelectionsBodySchema = z
  .object({
    featuredTourIds: z.array(z.number().int().positive()).max(12),
    popularTourIds: z.array(z.number().int().positive()).max(12),
    spotlightTourId: z.number().int().positive(),
  })
  .strict()
  .refine(
    (input) =>
      new Set(input.featuredTourIds).size === input.featuredTourIds.length &&
      new Set(input.popularTourIds).size === input.popularTourIds.length,
    { message: 'Homepage tour IDs must be unique within each selection.' },
  );

export const adminBlogPostCreateBodySchema = z.object(blogPostFields).strict();
export const adminBlogPostUpdateBodySchema = z
  .object(blogPostUpdateFields)
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one blog post field is required.',
  });
export const adminBlogPostListQuerySchema = z
  .object({
    ...pageQuery,
    query: listQuery,
    status: z.enum(BlogPostStatus).optional(),
  })
  .strict();
export const adminCommentListQuerySchema = z
  .object({
    ...pageQuery,
    postId: objectId().optional(),
    query: listQuery,
    status: z.enum(BlogCommentStatus).optional(),
  })
  .strict();
export const adminCommentStatusBodySchema = z
  .object({ status: z.enum(BlogCommentStatus) })
  .strict();

export const adminContactListQuerySchema = z
  .object({
    ...pageQuery,
    query: listQuery,
    status: z.enum(ContactMessageStatus).optional(),
  })
  .strict();
export const adminContactStatusBodySchema = z
  .object({ status: z.enum(ContactMessageStatus) })
  .strict();

export const adminBookingListQuerySchema = z
  .object({
    ...pageQuery,
    query: listQuery,
    status: z.enum(BookingStatus).optional(),
  })
  .strict();
export const adminBookingStatusBodySchema = z
  .object({
    status: z.enum([BookingStatus.CANCELLED, BookingStatus.COMPLETED]),
  })
  .strict();

export const adminPaymentListQuerySchema = z
  .object({
    ...pageQuery,
    query: listQuery,
    status: z.enum(PaymentStatus).optional(),
  })
  .strict();
export const adminRefundBodySchema = z
  .object({
    amountCents: z.number().int().positive().optional(),
  })
  .strict();

export const adminMemberListQuerySchema = z
  .object({
    ...pageQuery,
    query: listQuery,
    role: z.enum(MemberRole).optional(),
    status: z.enum(MemberStatus).optional(),
  })
  .strict();
export const adminMemberStatusBodySchema = z.object({ status: z.enum(MemberStatus) }).strict();
