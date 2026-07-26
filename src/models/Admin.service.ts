import mongoose, { type ClientSession, type Types } from 'mongoose';
import { AppError } from '../common/errors/app-error';
import { ErrorCode, HttpCode } from '../common/errors/error-codes';
import { AuditActorType } from '../libs/enums/audit.enum';
import { BlogPostStatus } from '../libs/enums/blog.enum';
import type { BlogCommentStatus } from '../libs/enums/blog.enum';
import { BookingStatus } from '../libs/enums/booking.enum';
import { ContactMessageStatus, NewsletterSubscriptionStatus } from '../libs/enums/engagement.enum';
import { TourStatus } from '../libs/enums/tour.enum';
import type {
  AdminBlogCommentInquiry,
  AdminBlogCommentView,
  AdminBlogPostInquiry,
  AdminBlogPostView,
  BlogComment as BlogCommentEntity,
  BlogPost,
  BlogPostInput,
  BlogPostUpdateInput,
  PaginatedAdminBlogComments,
  PaginatedAdminBlogPosts,
} from '../libs/types/blog';
import type {
  AdminBookingView,
  AdminBookingStatusInput,
  Booking,
  BookingInquiry,
  BookingView,
} from '../libs/types/booking';
import type {
  ContactMessage,
  ContactMessageInquiry,
  ContactMessageView,
  NewsletterSubscription,
  NewsletterSubscriptionInquiry,
  NewsletterSubscriptionView,
  PaginatedContactMessages,
  PaginatedNewsletterSubscriptions,
} from '../libs/types/engagement';
import type { AuthContext, RequestContext } from '../libs/types/member';
import { MemberRole } from '../libs/enums/member.enum';
import type {
  AdminPaymentView,
  Payment,
  PaymentInquiry,
  PaymentRefundInput,
  PaymentRefundResult,
} from '../libs/types/payment';
import type {
  AdminDepartureInquiry,
  AdminTourDetail,
  AdminTourInquiry,
  AdminTourDepartureView,
  AdminTourImageView,
  AdminTourView,
  HomepageSelectionsInput,
  HomepageSelectionsResult,
  HomepageSelectionsView,
  PaginatedAdminDepartures,
  PaginatedAdminTours,
  PaginationMeta,
  Tour,
  TourDeparture,
  TourDepartureInput,
  TourDepartureUpdateInput,
  TourImage,
  TourImageInput,
  TourInput,
  TourUpdateInput,
} from '../libs/types/tour';
import AuditLog from '../schema/AuditLog.model';
import BlogComment from '../schema/BlogComment.model';
import BlogPostModel from '../schema/BlogPost.model';
import BookingModel from '../schema/Booking.model';
import ContactMessageModel from '../schema/ContactMessage.model';
import NewsletterSubscriptionModel from '../schema/NewsletterSubscription.model';
import PaymentModel from '../schema/Payment.model';
import TourModel from '../schema/Tour.model';
import TourDepartureModel from '../schema/TourDeparture.model';
import TourImageModel from '../schema/TourImage.model';
import PaymentService from './Payment.service';

function notFound(code: ErrorCode, message: string): AppError {
  return new AppError(HttpCode.NOT_FOUND, code, message);
}

function invalidState(message: string): AppError {
  return new AppError(HttpCode.CONFLICT, ErrorCode.INVALID_BOOKING_STATE, message);
}

function pagination(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

function searchRegex(query: string): RegExp {
  return new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function toTourView(tour: Tour): AdminTourView {
  return {
    id: tour._id,
    slug: tour.slug,
    country: tour.country,
    place: tour.place,
    title: tour.title,
    location: tour.location,
    type: tour.type,
    priceCents: tour.priceCents,
    ...(tour.oldPriceCents !== undefined ? { oldPriceCents: tour.oldPriceCents } : {}),
    currency: tour.currency,
    ratingAverage: tour.ratingAverage,
    reviewCount: tour.reviewCount,
    durationDays: tour.durationDays,
    maxGroupSize: tour.maxGroupSize,
    overview: tour.overview,
    highlights: tour.highlights,
    itinerary: tour.itinerary,
    included: tour.included,
    notIncluded: tour.notIncluded,
    status: tour.status,
    ...(tour.featuredRank !== undefined ? { featuredRank: tour.featuredRank } : {}),
    ...(tour.popularityRank !== undefined ? { popularityRank: tour.popularityRank } : {}),
    ...(tour.homepageSpotlight !== undefined ? { homepageSpotlight: tour.homepageSpotlight } : {}),
    ...(tour.publishedAt ? { publishedAt: tour.publishedAt.toISOString() } : {}),
    createdAt: tour.createdAt.toISOString(),
    updatedAt: tour.updatedAt.toISOString(),
  };
}

function toDepartureView(departure: TourDeparture): AdminTourDepartureView {
  return {
    id: departure._id.toString(),
    tourId: departure.tourId,
    startDate: departure.startDate.toISOString(),
    capacity: departure.capacity,
    reservedSeats: departure.reservedSeats,
    priceCents: departure.priceCents,
    currency: departure.currency,
    status: departure.status,
    createdAt: departure.createdAt.toISOString(),
    updatedAt: departure.updatedAt.toISOString(),
  };
}

function toBlogPostView(post: BlogPost): AdminBlogPostView {
  return {
    id: post._id.toString(),
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    category: post.category,
    imageUrl: post.imageUrl,
    authorName: post.authorName,
    ...(post.authorImageUrl ? { authorImageUrl: post.authorImageUrl } : {}),
    status: post.status,
    ...(post.publishedAt ? { publishedAt: post.publishedAt.toISOString() } : {}),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

function toBlogCommentView(comment: BlogCommentEntity): AdminBlogCommentView {
  return {
    id: comment._id.toString(),
    postId: comment.postId.toString(),
    ...(comment.memberId ? { memberId: comment.memberId.toString() } : {}),
    name: comment.name,
    email: comment.email,
    body: comment.body,
    status: comment.status,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

function toContactView(contact: ContactMessage): ContactMessageView {
  return {
    id: contact._id.toString(),
    ...(contact.memberId ? { memberId: contact.memberId.toString() } : {}),
    fullName: contact.fullName,
    email: contact.email,
    ...(contact.phone ? { phone: contact.phone } : {}),
    subject: contact.subject,
    message: contact.message,
    status: contact.status,
    ...(contact.resolvedAt ? { resolvedAt: contact.resolvedAt.toISOString() } : {}),
    createdAt: contact.createdAt.toISOString(),
  };
}

function toSubscriptionView(subscription: NewsletterSubscription): NewsletterSubscriptionView {
  return {
    id: subscription._id.toString(),
    email: subscription.email,
    status: subscription.status,
    source: subscription.source,
    consentedAt: subscription.consentedAt.toISOString(),
    ...(subscription.confirmedAt ? { confirmedAt: subscription.confirmedAt.toISOString() } : {}),
    createdAt: subscription.createdAt.toISOString(),
  };
}

function toBookingView(booking: Booking): AdminBookingView {
  return {
    id: booking._id.toString(),
    memberId: booking.memberId.toString(),
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
    holdExpiresAt: booking.holdExpiresAt.toISOString(),
    ...(booking.confirmedAt ? { confirmedAt: booking.confirmedAt.toISOString() } : {}),
    ...(booking.cancelledAt ? { cancelledAt: booking.cancelledAt.toISOString() } : {}),
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

function toPaymentView(payment: Payment): AdminPaymentView {
  return {
    id: payment._id.toString(),
    bookingId: payment.bookingId.toString(),
    providerIntentId: payment.providerIntentId,
    status: payment.status,
    amountCents: payment.amountCents,
    pendingRefundAmountCents: payment.pendingRefundAmountCents ?? 0,
    refundedAmountCents: payment.refundedAmountCents ?? 0,
    currency: payment.currency,
    ...(payment.paidAt ? { paidAt: payment.paidAt.toISOString() } : {}),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

class AdminService {
  public constructor(
    private readonly now: () => Date = () => new Date(),
    private readonly paymentService: PaymentService = new PaymentService(),
  ) {}

  public async getTours(
    auth: AuthContext,
    inquiry: AdminTourInquiry,
  ): Promise<PaginatedAdminTours> {
    this.assertAdmin(auth);
    const filter: Record<string, unknown> = {};
    if (inquiry.status) filter.status = inquiry.status;
    if (inquiry.type) filter.type = inquiry.type;
    if (inquiry.query) {
      const regex = searchRegex(inquiry.query);
      const textFilters: Record<string, unknown>[] = [
        { title: regex },
        { slug: regex },
        { country: regex },
        { place: regex },
        { location: regex },
      ];
      const numericId = Number(inquiry.query);
      if (Number.isInteger(numericId) && numericId > 0) textFilters.push({ _id: numericId });
      filter.$or = textFilters;
    }
    const [tours, total] = await Promise.all([
      TourModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((inquiry.page - 1) * inquiry.limit)
        .limit(inquiry.limit)
        .lean<Tour[]>()
        .exec(),
      TourModel.countDocuments(filter).exec(),
    ]);
    return {
      data: tours.map(toTourView),
      meta: pagination(inquiry.page, inquiry.limit, total),
    };
  }

  public async getTour(auth: AuthContext, tourId: number): Promise<AdminTourDetail> {
    this.assertAdmin(auth);
    const [tour, images] = await Promise.all([
      TourModel.findById(tourId).lean<Tour>().exec(),
      TourImageModel.find({ tourId }).sort({ position: 1 }).lean<TourImage[]>().exec(),
    ]);
    if (!tour) throw notFound(ErrorCode.TOUR_NOT_FOUND, 'Tour not found.');
    return {
      ...toTourView(tour),
      images: images.map((image) => ({
        id: image._id.toString(),
        tourId: image.tourId,
        url: image.url,
        altText: image.altText,
        position: image.position,
      })),
    };
  }

  public async createTour(
    auth: AuthContext,
    input: TourInput,
    context: RequestContext,
  ): Promise<AdminTourView> {
    this.assertAdmin(auth);
    return mongoose.connection.transaction(async (session) => {
      const payload = this.withTourPublishingDate(input);
      let tour: Tour;
      try {
        const [created] = await TourModel.create([payload], { session });
        if (!created) throw new Error('Tour creation returned no document.');
        tour = created.toObject();
      } catch (err) {
        if (this.isDuplicateKeyError(err)) {
          throw new AppError(
            HttpCode.CONFLICT,
            ErrorCode.RESOURCE_CONFLICT,
            'The tour ID or slug is already in use.',
            { cause: err },
          );
        }
        throw err;
      }
      await this.writeAudit(auth, 'admin.tour_created', 'tour', String(tour._id), context, session);
      return toTourView(tour);
    });
  }

  public async updateTour(
    auth: AuthContext,
    input: TourUpdateInput,
    context: RequestContext,
  ): Promise<AdminTourView> {
    this.assertAdmin(auth);
    try {
      return await mongoose.connection.transaction(async (session) => {
        const { _id, ...changes } = input;
        const update = this.withTourPublishingDate(changes);
        const tour = await TourModel.findByIdAndUpdate(
          _id,
          { $set: update },
          { new: true, session },
        )
          .lean<Tour>()
          .exec();
        if (!tour) throw notFound(ErrorCode.TOUR_NOT_FOUND, 'Tour not found.');
        await this.writeAudit(
          auth,
          'admin.tour_updated',
          'tour',
          String(tour._id),
          context,
          session,
        );
        return toTourView(tour);
      });
    } catch (err) {
      this.throwContentConflict(err, 'The tour slug is already in use.');
    }
  }

  public async upsertTourImage(
    auth: AuthContext,
    input: TourImageInput,
    context: RequestContext,
  ): Promise<AdminTourImageView> {
    this.assertAdmin(auth);
    return mongoose.connection.transaction(async (session) => {
      const tourExists = await TourModel.exists({ _id: input.tourId }).session(session);
      if (!tourExists) throw notFound(ErrorCode.TOUR_NOT_FOUND, 'Tour not found.');
      const image = await TourImageModel.findOneAndUpdate(
        { tourId: input.tourId, position: input.position },
        { $set: input },
        { new: true, session, setDefaultsOnInsert: true, upsert: true },
      )
        .lean<TourImage>()
        .exec();
      if (!image) throw new Error('Tour image upsert returned no document.');
      await this.writeAudit(
        auth,
        'admin.tour_image_upserted',
        'tour_image',
        image._id.toString(),
        context,
        session,
      );
      return {
        id: image._id.toString(),
        tourId: image.tourId,
        url: image.url,
        altText: image.altText,
        position: image.position,
      };
    });
  }

  public async deleteTourImage(
    auth: AuthContext,
    tourId: number,
    position: number,
    context: RequestContext,
  ): Promise<void> {
    this.assertAdmin(auth);
    await mongoose.connection.transaction(async (session) => {
      const image = await TourImageModel.findOneAndDelete({ tourId, position }, { session })
        .lean<TourImage>()
        .exec();
      if (!image) {
        throw notFound(ErrorCode.TOUR_IMAGE_NOT_FOUND, 'Tour image not found.');
      }
      await this.writeAudit(
        auth,
        'admin.tour_image_deleted',
        'tour_image',
        image._id.toString(),
        context,
        session,
      );
    });
  }

  public async createDeparture(
    auth: AuthContext,
    input: TourDepartureInput,
    context: RequestContext,
  ): Promise<AdminTourDepartureView> {
    this.assertAdmin(auth);
    return mongoose.connection.transaction(async (session) => {
      const tourExists = await TourModel.exists({ _id: input.tourId }).session(session);
      if (!tourExists) throw notFound(ErrorCode.TOUR_NOT_FOUND, 'Tour not found.');
      const [created] = await TourDepartureModel.create([{ ...input, reservedSeats: 0 }], {
        session,
      });
      if (!created) throw new Error('Departure creation returned no document.');
      await this.writeAudit(
        auth,
        'admin.departure_created',
        'tour_departure',
        created._id.toString(),
        context,
        session,
      );
      return toDepartureView(created.toObject());
    });
  }

  public async getDepartures(
    auth: AuthContext,
    inquiry: AdminDepartureInquiry,
  ): Promise<PaginatedAdminDepartures> {
    this.assertAdmin(auth);
    const filter: Record<string, unknown> = {};
    if (inquiry.tourId) filter.tourId = inquiry.tourId;
    if (inquiry.status) filter.status = inquiry.status;
    if (inquiry.from) filter.startDate = { $gte: inquiry.from };
    const [departures, total] = await Promise.all([
      TourDepartureModel.find(filter)
        .sort({ startDate: 1, _id: 1 })
        .skip((inquiry.page - 1) * inquiry.limit)
        .limit(inquiry.limit)
        .lean<TourDeparture[]>()
        .exec(),
      TourDepartureModel.countDocuments(filter).exec(),
    ]);
    return {
      data: departures.map(toDepartureView),
      meta: pagination(inquiry.page, inquiry.limit, total),
    };
  }

  public async updateDeparture(
    auth: AuthContext,
    input: TourDepartureUpdateInput,
    context: RequestContext,
  ): Promise<AdminTourDepartureView> {
    this.assertAdmin(auth);
    return mongoose.connection.transaction(async (session) => {
      const { _id, ...changes } = input;
      const departure = await TourDepartureModel.findOneAndUpdate(
        {
          _id,
          ...(changes.capacity !== undefined ? { reservedSeats: { $lte: changes.capacity } } : {}),
        },
        { $set: changes },
        { new: true, session },
      )
        .lean<TourDeparture>()
        .exec();
      if (!departure) {
        const exists = await TourDepartureModel.exists({ _id }).session(session);
        if (!exists) {
          throw notFound(ErrorCode.DEPARTURE_NOT_FOUND, 'Tour departure not found.');
        }
        throw new AppError(
          HttpCode.CONFLICT,
          ErrorCode.RESOURCE_CONFLICT,
          'Capacity cannot be lower than currently reserved seats.',
        );
      }
      await this.writeAudit(
        auth,
        'admin.departure_updated',
        'tour_departure',
        departure._id.toString(),
        context,
        session,
      );
      return toDepartureView(departure);
    });
  }

  public async updateHomepageSelections(
    auth: AuthContext,
    input: HomepageSelectionsInput,
    context: RequestContext,
  ): Promise<HomepageSelectionsResult> {
    this.assertAdmin(auth);
    return mongoose.connection.transaction(async (session) => {
      const selectedIds = [
        ...new Set([...input.featuredTourIds, ...input.popularTourIds, input.spotlightTourId]),
      ];
      const publishedCount = await TourModel.countDocuments({
        _id: { $in: selectedIds },
        status: TourStatus.PUBLISHED,
      }).session(session);
      if (publishedCount !== selectedIds.length) {
        throw new AppError(
          HttpCode.CONFLICT,
          ErrorCode.RESOURCE_CONFLICT,
          'Every homepage selection must be a published tour.',
        );
      }
      await TourModel.updateMany(
        {
          $or: [{ featuredRank: { $exists: true } }, { popularityRank: { $exists: true } }],
        },
        {
          $unset: { featuredRank: 1, popularityRank: 1 },
          $set: { homepageSpotlight: false },
        },
        { session },
      ).exec();
      const operations = [
        ...input.featuredTourIds.map((tourId, index) => ({
          updateOne: {
            filter: { _id: tourId },
            update: { $set: { featuredRank: index + 1 } },
          },
        })),
        ...input.popularTourIds.map((tourId, index) => ({
          updateOne: {
            filter: { _id: tourId },
            update: { $set: { popularityRank: index + 1 } },
          },
        })),
        {
          updateOne: {
            filter: { _id: input.spotlightTourId },
            update: { $set: { homepageSpotlight: true } },
          },
        },
      ];
      if (operations.length > 0) {
        await TourModel.bulkWrite(operations, { session });
      }
      await this.writeAudit(
        auth,
        'admin.homepage_selections_updated',
        'homepage',
        'tour-selections',
        context,
        session,
      );
      return input;
    });
  }

  public async getHomepageSelections(auth: AuthContext): Promise<HomepageSelectionsView> {
    this.assertAdmin(auth);
    const [featured, popular, spotlight] = await Promise.all([
      TourModel.find({ featuredRank: { $exists: true } })
        .sort({ featuredRank: 1 })
        .select({ _id: 1 })
        .lean<Array<Pick<Tour, '_id'>>>()
        .exec(),
      TourModel.find({ popularityRank: { $exists: true } })
        .sort({ popularityRank: 1 })
        .select({ _id: 1 })
        .lean<Array<Pick<Tour, '_id'>>>()
        .exec(),
      TourModel.findOne({ homepageSpotlight: true })
        .select({ _id: 1 })
        .lean<Pick<Tour, '_id'>>()
        .exec(),
    ]);
    return {
      featuredTourIds: featured.map((tour) => tour._id),
      popularTourIds: popular.map((tour) => tour._id),
      ...(spotlight ? { spotlightTourId: spotlight._id } : {}),
    };
  }

  public async getBlogPosts(
    auth: AuthContext,
    inquiry: AdminBlogPostInquiry,
  ): Promise<PaginatedAdminBlogPosts> {
    this.assertAdmin(auth);
    const filter: Record<string, unknown> = {};
    if (inquiry.status) filter.status = inquiry.status;
    if (inquiry.query) {
      const regex = searchRegex(inquiry.query);
      filter.$or = [{ title: regex }, { slug: regex }, { category: regex }, { authorName: regex }];
    }
    const [posts, total] = await Promise.all([
      BlogPostModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((inquiry.page - 1) * inquiry.limit)
        .limit(inquiry.limit)
        .lean<BlogPost[]>()
        .exec(),
      BlogPostModel.countDocuments(filter).exec(),
    ]);
    return {
      data: posts.map(toBlogPostView),
      meta: pagination(inquiry.page, inquiry.limit, total),
    };
  }

  public async createBlogPost(
    auth: AuthContext,
    input: BlogPostInput,
    context: RequestContext,
  ): Promise<AdminBlogPostView> {
    this.assertAdmin(auth);
    try {
      return await mongoose.connection.transaction(async (session) => {
        const payload = this.withBlogPublishingDate(input);
        const [created] = await BlogPostModel.create([payload], { session });
        if (!created) throw new Error('Blog post creation returned no document.');
        await this.writeAudit(
          auth,
          'admin.blog_post_created',
          'blog_post',
          created._id.toString(),
          context,
          session,
        );
        return toBlogPostView(created.toObject());
      });
    } catch (err) {
      this.throwContentConflict(err, 'The blog post slug is already in use.');
    }
  }

  public async updateBlogPost(
    auth: AuthContext,
    input: BlogPostUpdateInput,
    context: RequestContext,
  ): Promise<AdminBlogPostView> {
    this.assertAdmin(auth);
    try {
      return await mongoose.connection.transaction(async (session) => {
        const { _id, ...changes } = input;
        const post = await BlogPostModel.findByIdAndUpdate(
          _id,
          { $set: this.withBlogPublishingDate(changes) },
          { new: true, session },
        )
          .lean<BlogPost>()
          .exec();
        if (!post) {
          throw notFound(ErrorCode.BLOG_POST_NOT_FOUND, 'Blog post not found.');
        }
        await this.writeAudit(
          auth,
          'admin.blog_post_updated',
          'blog_post',
          post._id.toString(),
          context,
          session,
        );
        return toBlogPostView(post);
      });
    } catch (err) {
      this.throwContentConflict(err, 'The blog post slug is already in use.');
    }
  }

  public async moderateComment(
    auth: AuthContext,
    commentId: Types.ObjectId,
    status: BlogCommentStatus,
    context: RequestContext,
  ): Promise<{ id: string; status: string }> {
    this.assertAdmin(auth);
    return mongoose.connection.transaction(async (session) => {
      const comment = await BlogComment.findByIdAndUpdate(
        commentId,
        { $set: { status } },
        { new: true, session },
      )
        .lean()
        .exec();
      if (!comment) {
        throw notFound(ErrorCode.BLOG_COMMENT_NOT_FOUND, 'Blog comment not found.');
      }
      await this.writeAudit(
        auth,
        'admin.blog_comment_moderated',
        'blog_comment',
        comment._id.toString(),
        context,
        session,
      );
      return { id: comment._id.toString(), status: comment.status };
    });
  }

  public async getComments(
    auth: AuthContext,
    inquiry: AdminBlogCommentInquiry,
  ): Promise<PaginatedAdminBlogComments> {
    this.assertAdmin(auth);
    const filter: Record<string, unknown> = {};
    if (inquiry.postId) filter.postId = inquiry.postId;
    if (inquiry.status) filter.status = inquiry.status;
    if (inquiry.query) {
      const regex = searchRegex(inquiry.query);
      filter.$or = [{ name: regex }, { email: regex }, { body: regex }];
    }
    const [comments, total] = await Promise.all([
      BlogComment.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((inquiry.page - 1) * inquiry.limit)
        .limit(inquiry.limit)
        .lean<BlogCommentEntity[]>()
        .exec(),
      BlogComment.countDocuments(filter).exec(),
    ]);
    return {
      data: comments.map(toBlogCommentView),
      meta: pagination(inquiry.page, inquiry.limit, total),
    };
  }

  public async getContactMessages(
    auth: AuthContext,
    inquiry: ContactMessageInquiry,
  ): Promise<PaginatedContactMessages> {
    this.assertAdmin(auth);
    const filter: Record<string, unknown> = {};
    if (inquiry.status) filter.status = inquiry.status;
    if (inquiry.query) {
      const regex = searchRegex(inquiry.query);
      filter.$or = [{ fullName: regex }, { email: regex }, { subject: regex }, { message: regex }];
    }
    const [messages, total] = await Promise.all([
      ContactMessageModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((inquiry.page - 1) * inquiry.limit)
        .limit(inquiry.limit)
        .lean<ContactMessage[]>()
        .exec(),
      ContactMessageModel.countDocuments(filter).exec(),
    ]);
    return {
      data: messages.map(toContactView),
      meta: pagination(inquiry.page, inquiry.limit, total),
    };
  }

  public async updateContactStatus(
    auth: AuthContext,
    contactId: Types.ObjectId,
    status: ContactMessageStatus,
    context: RequestContext,
  ): Promise<ContactMessageView> {
    this.assertAdmin(auth);
    return mongoose.connection.transaction(async (session) => {
      const resolved =
        status === ContactMessageStatus.RESOLVED || status === ContactMessageStatus.CLOSED;
      const contact = await ContactMessageModel.findByIdAndUpdate(
        contactId,
        {
          $set: { status, ...(resolved ? { resolvedAt: this.now() } : {}) },
          ...(!resolved ? { $unset: { resolvedAt: 1 } } : {}),
        },
        { new: true, session },
      )
        .lean<ContactMessage>()
        .exec();
      if (!contact) {
        throw notFound(ErrorCode.CONTACT_MESSAGE_NOT_FOUND, 'Contact message not found.');
      }
      await this.writeAudit(
        auth,
        'admin.contact_status_updated',
        'contact_message',
        contact._id.toString(),
        context,
        session,
      );
      return toContactView(contact);
    });
  }

  public async getNewsletterSubscriptions(
    auth: AuthContext,
    inquiry: NewsletterSubscriptionInquiry,
  ): Promise<PaginatedNewsletterSubscriptions> {
    this.assertAdmin(auth);
    const filter: Record<string, unknown> = {};
    if (inquiry.status) filter.status = inquiry.status;
    if (inquiry.query) {
      const regex = searchRegex(inquiry.query);
      filter.$or = [{ email: regex }, { source: regex }];
    }
    const [subscriptions, total] = await Promise.all([
      NewsletterSubscriptionModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((inquiry.page - 1) * inquiry.limit)
        .limit(inquiry.limit)
        .lean<NewsletterSubscription[]>()
        .exec(),
      NewsletterSubscriptionModel.countDocuments(filter).exec(),
    ]);
    return {
      data: subscriptions.map(toSubscriptionView),
      meta: pagination(inquiry.page, inquiry.limit, total),
    };
  }

  public async updateNewsletterStatus(
    auth: AuthContext,
    subscriptionId: Types.ObjectId,
    status: NewsletterSubscriptionStatus,
    context: RequestContext,
  ): Promise<NewsletterSubscriptionView> {
    this.assertAdmin(auth);
    return mongoose.connection.transaction(async (session) => {
      const active = status === NewsletterSubscriptionStatus.ACTIVE;
      const subscription = await NewsletterSubscriptionModel.findByIdAndUpdate(
        subscriptionId,
        {
          $set: { status, ...(active ? { confirmedAt: this.now() } : {}) },
          ...(!active ? { $unset: { confirmedAt: 1 } } : {}),
        },
        { new: true, session },
      )
        .lean<NewsletterSubscription>()
        .exec();
      if (!subscription) {
        throw notFound(
          ErrorCode.NEWSLETTER_SUBSCRIPTION_NOT_FOUND,
          'Newsletter subscription not found.',
        );
      }
      await this.writeAudit(
        auth,
        'admin.newsletter_status_updated',
        'newsletter_subscription',
        subscription._id.toString(),
        context,
        session,
      );
      return toSubscriptionView(subscription);
    });
  }

  public async getBookings(
    auth: AuthContext,
    inquiry: BookingInquiry,
  ): Promise<{ data: AdminBookingView[]; meta: PaginationMeta }> {
    this.assertAdmin(auth);
    const filter: Record<string, unknown> = {};
    if (inquiry.status) filter.status = inquiry.status;
    if (inquiry.query) {
      const regex = searchRegex(inquiry.query);
      const queryFilters: Record<string, unknown>[] = [{ reference: regex }];
      if (mongoose.Types.ObjectId.isValid(inquiry.query)) {
        const objectId = new mongoose.Types.ObjectId(inquiry.query);
        queryFilters.push({ _id: objectId }, { memberId: objectId }, { departureId: objectId });
      }
      const numericTourId = Number(inquiry.query);
      if (Number.isInteger(numericTourId) && numericTourId > 0) {
        queryFilters.push({ tourId: numericTourId });
      }
      filter.$or = queryFilters;
    }
    const [bookings, total] = await Promise.all([
      BookingModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((inquiry.page - 1) * inquiry.limit)
        .limit(inquiry.limit)
        .lean<Booking[]>()
        .exec(),
      BookingModel.countDocuments(filter).exec(),
    ]);
    return {
      data: bookings.map(toBookingView),
      meta: pagination(inquiry.page, inquiry.limit, total),
    };
  }

  public async updateBookingStatus(
    auth: AuthContext,
    input: AdminBookingStatusInput,
    context: RequestContext,
  ): Promise<BookingView> {
    this.assertAdmin(auth);
    return mongoose.connection.transaction(async (session) => {
      const booking = await BookingModel.findById(input.bookingId)
        .session(session)
        .lean<Booking>()
        .exec();
      if (!booking) throw notFound(ErrorCode.BOOKING_NOT_FOUND, 'Booking not found.');

      if (input.status === BookingStatus.COMPLETED && booking.status !== BookingStatus.CONFIRMED) {
        throw invalidState('Only a confirmed booking can be completed.');
      }
      if (
        input.status === BookingStatus.CANCELLED &&
        booking.status !== BookingStatus.PENDING_PAYMENT
      ) {
        throw invalidState('Paid bookings must be refunded before cancellation.');
      }

      const cancelled = input.status === BookingStatus.CANCELLED;
      const updated = await BookingModel.findOneAndUpdate(
        { _id: booking._id, status: booking.status },
        {
          $set: {
            status: input.status,
            ...(cancelled ? { cancelledAt: this.now() } : {}),
          },
        },
        { new: true, session },
      )
        .lean<Booking>()
        .exec();
      if (!updated) throw invalidState('The booking state changed before the update completed.');
      if (cancelled) {
        await TourDepartureModel.updateOne(
          { _id: booking.departureId, reservedSeats: { $gte: booking.travelers } },
          { $inc: { reservedSeats: -booking.travelers } },
          { session },
        ).exec();
      }
      await this.writeAudit(
        auth,
        'admin.booking_status_updated',
        'booking',
        booking._id.toString(),
        context,
        session,
      );
      return toBookingView(updated);
    });
  }

  public async getPayments(
    auth: AuthContext,
    inquiry: PaymentInquiry,
  ): Promise<{ data: AdminPaymentView[]; meta: PaginationMeta }> {
    this.assertAdmin(auth);
    const filter: Record<string, unknown> = {};
    if (inquiry.status) filter.status = inquiry.status;
    if (inquiry.query) {
      const regex = searchRegex(inquiry.query);
      const queryFilters: Record<string, unknown>[] = [{ providerIntentId: regex }];
      if (mongoose.Types.ObjectId.isValid(inquiry.query)) {
        const objectId = new mongoose.Types.ObjectId(inquiry.query);
        queryFilters.push({ _id: objectId }, { bookingId: objectId });
      }
      filter.$or = queryFilters;
    }
    const [payments, total] = await Promise.all([
      PaymentModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((inquiry.page - 1) * inquiry.limit)
        .limit(inquiry.limit)
        .lean<Payment[]>()
        .exec(),
      PaymentModel.countDocuments(filter).exec(),
    ]);
    return {
      data: payments.map(toPaymentView),
      meta: pagination(inquiry.page, inquiry.limit, total),
    };
  }

  public async refundPayment(
    auth: AuthContext,
    input: PaymentRefundInput,
    context: RequestContext,
  ): Promise<PaymentRefundResult> {
    this.assertAdmin(auth);
    return this.paymentService.refundPayment(auth, input, context);
  }

  private assertAdmin(auth: AuthContext): void {
    if (auth.role !== MemberRole.ADMIN) {
      throw new AppError(
        HttpCode.FORBIDDEN,
        ErrorCode.AUTHORIZATION_REQUIRED,
        'Administrator access is required.',
      );
    }
  }

  private withTourPublishingDate<T extends Partial<TourInput | TourUpdateInput>>(input: T): T {
    if (input.status !== TourStatus.PUBLISHED || input.publishedAt) return input;
    return { ...input, publishedAt: this.now() };
  }

  private withBlogPublishingDate<T extends Partial<BlogPostInput | BlogPostUpdateInput>>(
    input: T,
  ): T {
    if (input.status !== BlogPostStatus.PUBLISHED || input.publishedAt) return input;
    return { ...input, publishedAt: this.now() };
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: unknown }).code === 11_000
    );
  }

  private throwContentConflict(err: unknown, message: string): never {
    if (this.isDuplicateKeyError(err)) {
      throw new AppError(HttpCode.CONFLICT, ErrorCode.RESOURCE_CONFLICT, message, {
        cause: err,
      });
    }
    throw err;
  }

  private async writeAudit(
    auth: AuthContext,
    action: string,
    entityType: string,
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
          entityType,
          entityId,
          requestId: context.requestId,
          ipAddress: context.ipAddress,
        },
      ],
      { session },
    );
  }
}

export default AdminService;
