import { Types, type PipelineStage } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import Tour from '../schema/Tour.model';
import TourDeparture from '../schema/TourDeparture.model';
import TourService from './Tour.service';

function tourAggregateResult(value: unknown) {
  return {
    exec: vi.fn().mockResolvedValue(value),
  } as unknown as ReturnType<typeof Tour.aggregate>;
}

function departureAggregateResult(value: unknown) {
  return {
    exec: vi.fn().mockResolvedValue(value),
  } as unknown as ReturnType<typeof TourDeparture.aggregate>;
}

function findOneResult(value: unknown) {
  const query = {
    select: vi.fn(),
    lean: vi.fn(),
    exec: vi.fn().mockResolvedValue(value),
  };
  query.select.mockReturnValue(query);
  query.lean.mockReturnValue(query);
  return query as unknown as ReturnType<typeof Tour.findOne>;
}

describe('TourService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('builds filters, sorting, pagination, and metadata in one list aggregation', async () => {
    const aggregate = vi.spyOn(Tour, 'aggregate').mockReturnValue(
      tourAggregateResult([
        {
          data: [{ id: 3, title: 'Nusa Penida', images: [] }],
          metadata: [{ total: 10 }],
        },
      ]),
    );
    const service = new TourService();

    const result = await service.getTours({
      query: 'bali',
      destination: 'Indonesia',
      type: 'Adventure',
      minPrice: 50_000,
      maxPrice: 200_000,
      duration: 'short',
      minRating: 4.5,
      sort: 'price-asc',
      page: 2,
      limit: 3,
    });

    const pipeline = aggregate.mock.calls[0]?.[0] as PipelineStage[];
    expect(pipeline[0]).toMatchObject({
      $match: {
        status: 'PUBLISHED',
        priceCents: { $gte: 50_000, $lte: 200_000 },
        durationDays: { $lte: 4 },
        ratingAverage: { $gte: 4.5 },
      },
    });
    expect(pipeline[1]).toEqual({ $sort: { priceCents: 1, _id: 1 } });
    const facet = pipeline[2] as PipelineStage.Facet;
    expect(facet.$facet.data?.slice(0, 2)).toEqual([{ $skip: 3 }, { $limit: 3 }]);
    expect(result.meta).toEqual({ page: 2, limit: 3, total: 10, totalPages: 4 });
  });

  it('throws a typed not-found error for an unpublished or missing tour', async () => {
    vi.spyOn(Tour, 'aggregate').mockReturnValue(tourAggregateResult([]));

    await expect(new TourService().getTour(999)).rejects.toBeInstanceOf(AppError);
  });

  it('ranks and returns three related tours', async () => {
    vi.spyOn(Tour, 'findOne').mockReturnValue(
      findOneResult({ _id: 1, country: 'Indonesia', type: 'Cultural' }),
    );
    const aggregate = vi
      .spyOn(Tour, 'aggregate')
      .mockReturnValue(tourAggregateResult([{ id: 2 }, { id: 3 }, { id: 4 }]));

    const result = await new TourService().getRelatedTours(1);
    const pipeline = aggregate.mock.calls[0]?.[0] as PipelineStage[];

    expect(result).toHaveLength(3);
    expect(pipeline).toContainEqual({ $limit: 3 });
  });

  it('returns only departures with enough remaining seats', async () => {
    vi.spyOn(Tour, 'findOne').mockReturnValue(findOneResult({ _id: 1, maxGroupSize: 12 }));
    const departureId = new Types.ObjectId();
    const aggregate = vi
      .spyOn(TourDeparture, 'aggregate')
      .mockReturnValue(
        departureAggregateResult([
          { id: departureId, availableSeats: 6, priceCents: 89_900, currency: 'USD' },
        ]),
      );

    const result = await new TourService().getAvailability({ tourId: 1, travelers: 4 });
    const pipeline = aggregate.mock.calls[0]?.[0] as PipelineStage[];

    expect(pipeline[0]).toMatchObject({
      $match: {
        tourId: 1,
        status: 'SCHEDULED',
        $expr: { $gte: [{ $subtract: ['$capacity', '$reservedSeats'] }, 4] },
      },
    });
    expect(result).toMatchObject({ tourId: 1, travelers: 4, departures: [{ availableSeats: 6 }] });
  });

  it('rejects traveler counts above the tour group limit', async () => {
    vi.spyOn(Tour, 'findOne').mockReturnValue(findOneResult({ _id: 1, maxGroupSize: 8 }));

    await expect(
      new TourService().getAvailability({ tourId: 1, travelers: 9 }),
    ).rejects.toMatchObject({ code: ErrorCode.TRAVELER_LIMIT_EXCEEDED });
  });
});
