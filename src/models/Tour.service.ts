import { createHash } from 'node:crypto';
import type { PipelineStage } from 'mongoose';
import { AppError } from '../common/errors/app-error';
import { ErrorCode, HttpCode } from '../common/errors/error-codes';
import { TourDepartureStatus, TourStatus } from '../libs/enums/tour.enum';
import type {
  AvailabilityInquiry,
  AvailabilityResult,
  PaginatedTours,
  TourDetail,
  TourInquiry,
  TourSummary,
  TourViewInput,
  TourViewResult,
} from '../libs/types/tour';
import Tour from '../schema/Tour.model';
import TourDeparture from '../schema/TourDeparture.model';
import TourView from '../schema/TourView.model';

interface TourListFacetResult {
  data: TourSummary[];
  metadata: Array<{ total: number }>;
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function imageLookupStage(): PipelineStage.Lookup {
  return {
    $lookup: {
      from: 'tour_images',
      let: { currentTourId: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$tourId', '$$currentTourId'] } } },
        { $sort: { position: 1 } },
        { $project: { _id: 0, url: 1, altText: 1, position: 1 } },
      ],
      as: 'images',
    },
  };
}

function summaryProjectionStage(): PipelineStage.Project {
  return {
    $project: {
      _id: 0,
      id: '$_id',
      slug: 1,
      country: 1,
      place: 1,
      title: 1,
      location: 1,
      type: 1,
      priceCents: 1,
      oldPriceCents: 1,
      currency: 1,
      ratingAverage: 1,
      reviewCount: 1,
      viewCount: 1,
      durationDays: 1,
      maxGroupSize: 1,
      images: 1,
    },
  };
}

function buildTourMatch(inquiry: TourInquiry): Record<string, unknown> {
  const match: Record<string, unknown> = { status: TourStatus.PUBLISHED };

  if (inquiry.query) {
    const pattern = new RegExp(escapeRegularExpression(inquiry.query), 'i');
    match.$or = [
      { title: pattern },
      { location: pattern },
      { country: pattern },
      { place: pattern },
    ];
  }
  if (inquiry.destination) {
    match.country = new RegExp(`^${escapeRegularExpression(inquiry.destination)}$`, 'i');
  }
  if (inquiry.type) {
    match.type = new RegExp(`^${escapeRegularExpression(inquiry.type)}$`, 'i');
  }
  if (inquiry.minPrice !== undefined || inquiry.maxPrice !== undefined) {
    const priceRange: Record<string, number> = {};
    if (inquiry.minPrice !== undefined) priceRange.$gte = inquiry.minPrice;
    if (inquiry.maxPrice !== undefined) priceRange.$lte = inquiry.maxPrice;
    match.priceCents = priceRange;
  }
  if (inquiry.duration === 'short') match.durationDays = { $lte: 4 };
  if (inquiry.duration === 'medium') match.durationDays = { $gte: 5, $lte: 7 };
  if (inquiry.duration === 'long') match.durationDays = { $gte: 8 };
  if (inquiry.minRating !== undefined) match.ratingAverage = { $gte: inquiry.minRating };

  return match;
}

function buildTourSort(sort: TourInquiry['sort']): Record<string, 1 | -1> {
  const sorts: Record<NonNullable<TourInquiry['sort']>, Record<string, 1 | -1>> = {
    'price-asc': { priceCents: 1, _id: 1 },
    'price-desc': { priceCents: -1, _id: 1 },
    rating: { ratingAverage: -1, reviewCount: -1, _id: 1 },
    duration: { durationDays: 1, _id: 1 },
    popularity: { reviewCount: -1, ratingAverage: -1, _id: 1 },
  };

  return sorts[sort ?? 'popularity'];
}

class TourService {
  public async getTours(inquiry: TourInquiry): Promise<PaginatedTours> {
    const pipeline: PipelineStage[] = [
      { $match: buildTourMatch(inquiry) },
      { $sort: buildTourSort(inquiry.sort) },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: (inquiry.page - 1) * inquiry.limit },
            { $limit: inquiry.limit },
            imageLookupStage(),
            summaryProjectionStage(),
          ],
        },
      },
    ];
    const [result] = await Tour.aggregate<TourListFacetResult>(pipeline).exec();
    const total = result?.metadata[0]?.total ?? 0;

    return {
      data: result?.data ?? [],
      meta: {
        page: inquiry.page,
        limit: inquiry.limit,
        total,
        totalPages: Math.ceil(total / inquiry.limit),
      },
    };
  }

  public async getTour(tourId: number): Promise<TourDetail> {
    const pipeline: PipelineStage[] = [
      { $match: { _id: tourId, status: TourStatus.PUBLISHED } },
      imageLookupStage(),
      {
        $project: {
          ...(summaryProjectionStage().$project as Record<string, unknown>),
          overview: 1,
          highlights: 1,
          itinerary: 1,
          included: 1,
          notIncluded: 1,
        },
      },
    ];
    const [tour] = await Tour.aggregate<TourDetail>(pipeline).exec();
    if (!tour) {
      throw new AppError(HttpCode.NOT_FOUND, ErrorCode.TOUR_NOT_FOUND, 'Tour not found.');
    }
    return tour;
  }

  public async recordView(input: TourViewInput): Promise<TourViewResult> {
    const tour = await Tour.findOne({ _id: input.tourId, status: TourStatus.PUBLISHED })
      .select({ _id: 1, reviewCount: 1, viewCount: 1 })
      .lean()
      .exec();
    if (!tour) {
      throw new AppError(HttpCode.NOT_FOUND, ErrorCode.TOUR_NOT_FOUND, 'Tour not found.');
    }

    const viewerKey = input.memberId
      ? `member:${input.memberId.toString()}`
      : `visitor:${input.visitorId}`;
    const viewerKeyHash = createHash('sha256').update(viewerKey).digest('hex');
    let counted = false;

    try {
      const viewWrite = await TourView.updateOne(
        { tourId: input.tourId, viewerKeyHash },
        { $setOnInsert: { tourId: input.tourId, viewerKeyHash } },
        { upsert: true },
      ).exec();
      counted = viewWrite.upsertedCount === 1;
    } catch (err) {
      const duplicateKey =
        typeof err === 'object' && err !== null && 'code' in err && err.code === 11_000;
      if (!duplicateKey) throw err;
    }

    const initialViewCount = 240 + tour.reviewCount * 11 + (input.tourId % 7) * 73;
    const updatedTour = counted
      ? await Tour.findByIdAndUpdate(input.tourId, { $inc: { viewCount: 1 } }, { new: true })
          .select({ viewCount: 1 })
          .lean()
          .exec()
      : tour;

    return {
      counted,
      tourId: input.tourId,
      viewCount: updatedTour?.viewCount ?? initialViewCount,
    };
  }

  public async getRelatedTours(tourId: number): Promise<TourSummary[]> {
    const currentTour = await Tour.findOne({ _id: tourId, status: TourStatus.PUBLISHED })
      .select({ country: 1, type: 1 })
      .lean()
      .exec();
    if (!currentTour) {
      throw new AppError(HttpCode.NOT_FOUND, ErrorCode.TOUR_NOT_FOUND, 'Tour not found.');
    }

    const pipeline: PipelineStage[] = [
      { $match: { _id: { $ne: tourId }, status: TourStatus.PUBLISHED } },
      {
        $addFields: {
          relatedRank: {
            $switch: {
              branches: [
                { case: { $eq: ['$country', currentTour.country] }, then: 0 },
                { case: { $eq: ['$type', currentTour.type] }, then: 1 },
              ],
              default: 2,
            },
          },
        },
      },
      { $sort: { relatedRank: 1, reviewCount: -1, ratingAverage: -1, _id: 1 } },
      { $limit: 3 },
      imageLookupStage(),
      summaryProjectionStage(),
    ];

    return Tour.aggregate<TourSummary>(pipeline).exec();
  }

  public async getAvailability(inquiry: AvailabilityInquiry): Promise<AvailabilityResult> {
    const tour = await Tour.findOne({ _id: inquiry.tourId, status: TourStatus.PUBLISHED })
      .select({ maxGroupSize: 1 })
      .lean()
      .exec();
    if (!tour) {
      throw new AppError(HttpCode.NOT_FOUND, ErrorCode.TOUR_NOT_FOUND, 'Tour not found.');
    }
    if (inquiry.travelers > tour.maxGroupSize) {
      throw new AppError(
        HttpCode.UNPROCESSABLE_ENTITY,
        ErrorCode.TRAVELER_LIMIT_EXCEEDED,
        `This tour accepts at most ${tour.maxGroupSize} travelers per booking.`,
      );
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const lowerBound = inquiry.from && inquiry.from > today ? inquiry.from : today;
    const startDate: Record<string, Date> = { $gte: lowerBound };
    if (inquiry.to) startDate.$lte = inquiry.to;

    const departures = await TourDeparture.aggregate<AvailabilityResult['departures'][number]>([
      {
        $match: {
          tourId: inquiry.tourId,
          status: TourDepartureStatus.SCHEDULED,
          startDate,
          $expr: {
            $gte: [{ $subtract: ['$capacity', '$reservedSeats'] }, inquiry.travelers],
          },
        },
      },
      { $sort: { startDate: 1 } },
      {
        $project: {
          _id: 0,
          id: '$_id',
          startDate: 1,
          availableSeats: { $subtract: ['$capacity', '$reservedSeats'] },
          priceCents: 1,
          currency: 1,
        },
      },
    ]).exec();

    return { tourId: inquiry.tourId, travelers: inquiry.travelers, departures };
  }
}

export default TourService;
