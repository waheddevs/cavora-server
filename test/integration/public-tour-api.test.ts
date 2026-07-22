import { Types } from 'mongoose';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/app';
import { ErrorCode, HttpCode } from '../../src/common/errors/error-codes';
import Tour from '../../src/schema/Tour.model';
import TourDeparture from '../../src/schema/TourDeparture.model';

const tourSummary = {
  id: 1,
  slug: 'ubud-cultural-rice-terrace-retreat',
  country: 'Indonesia',
  place: 'Ubud, Bali',
  title: 'Ubud Cultural & Rice Terrace Retreat',
  location: 'Ubud, Bali',
  type: 'Cultural',
  priceCents: 89_900,
  oldPriceCents: 109_000,
  currency: 'USD',
  ratingAverage: 4.8,
  reviewCount: 128,
  durationDays: 5,
  maxGroupSize: 12,
  images: [{ url: '/img/tour.jpg', altText: 'Tour image', position: 0 }],
};

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

describe('homepage and tour APIs', () => {
  afterEach(() => vi.restoreAllMocks());

  it('GET /cavora/home returns one cacheable homepage payload', async () => {
    vi.spyOn(Tour, 'aggregate').mockReturnValue(
      tourAggregateResult([
        { ...tourSummary, featuredRank: 1 },
        { ...tourSummary, id: 5, featuredRank: undefined, popularityRank: 1 },
        { ...tourSummary, id: 18 },
      ]),
    );

    const response = await request(app).get('/cavora/home');

    expect(response.status).toBe(HttpCode.OK);
    expect(response.headers['cache-control']).toContain('public');
    expect(response.body.data).toMatchObject({
      slides: expect.any(Array),
      featuredTours: [{ id: 1 }],
      popularTours: [{ id: 5 }],
      spotlight: { tour: { id: 18 } },
      gallery: expect.any(Array),
    });
  });

  it('GET /cavora/tours validates filters and returns pagination metadata', async () => {
    vi.spyOn(Tour, 'aggregate').mockReturnValue(
      tourAggregateResult([{ data: [tourSummary], metadata: [{ total: 1 }] }]),
    );

    const response = await request(app).get(
      '/cavora/tours?query=bali&destination=Indonesia&type=Cultural&minPrice=50000&maxPrice=200000&duration=medium&minRating=4.5&sort=price-asc&page=1&limit=9',
    );

    expect(response.status).toBe(HttpCode.OK);
    expect(response.body).toEqual({
      data: [tourSummary],
      meta: { page: 1, limit: 9, total: 1, totalPages: 1 },
    });
  });

  it('GET /cavora/tours/:id returns complete tour details', async () => {
    vi.spyOn(Tour, 'aggregate').mockReturnValue(
      tourAggregateResult([
        {
          ...tourSummary,
          overview: 'Overview',
          highlights: ['Highlight'],
          itinerary: [],
          included: [],
          notIncluded: [],
        },
      ]),
    );

    const response = await request(app).get('/cavora/tours/1');

    expect(response.status).toBe(HttpCode.OK);
    expect(response.body.data).toMatchObject({ id: 1, overview: 'Overview' });
  });

  it('GET /cavora/tours/:id/related returns related tour cards', async () => {
    vi.spyOn(Tour, 'findOne').mockReturnValue(
      findOneResult({ _id: 1, country: 'Indonesia', type: 'Cultural' }),
    );
    vi.spyOn(Tour, 'aggregate').mockReturnValue(
      tourAggregateResult([
        { ...tourSummary, id: 2 },
        { ...tourSummary, id: 3 },
        { ...tourSummary, id: 4 },
      ]),
    );

    const response = await request(app).get('/cavora/tours/1/related');

    expect(response.status).toBe(HttpCode.OK);
    expect(response.body.data.map((tour: { id: number }) => tour.id)).toEqual([2, 3, 4]);
  });

  it('GET /cavora/tours/:id/availability returns departures with authoritative cents', async () => {
    vi.spyOn(Tour, 'findOne').mockReturnValue(findOneResult({ _id: 1, maxGroupSize: 12 }));
    vi.spyOn(TourDeparture, 'aggregate').mockReturnValue(
      departureAggregateResult([
        {
          id: new Types.ObjectId(),
          startDate: new Date('2027-01-10T00:00:00.000Z'),
          availableSeats: 8,
          priceCents: 92_500,
          currency: 'USD',
        },
      ]),
    );

    const response = await request(app).get(
      '/cavora/tours/1/availability?travelers=2&from=2027-01-01&to=2027-02-01',
    );

    expect(response.status).toBe(HttpCode.OK);
    expect(response.body.data).toMatchObject({
      tourId: 1,
      travelers: 2,
      departures: [{ availableSeats: 8, priceCents: 92_500, currency: 'USD' }],
    });
  });

  it('returns validation errors before invalid tour requests reach services', async () => {
    const aggregate = vi.spyOn(Tour, 'aggregate');

    const [badId, badRange, unknownQuery] = await Promise.all([
      request(app).get('/cavora/tours/not-a-number'),
      request(app).get('/cavora/tours?minPrice=200000&maxPrice=50000'),
      request(app).get('/cavora/tours?unexpected=true'),
    ]);

    expect(badId.status).toBe(HttpCode.UNPROCESSABLE_ENTITY);
    expect(badRange.body.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(unknownQuery.body.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(aggregate).not.toHaveBeenCalled();
  });

  it('returns a typed 404 when a tour does not exist', async () => {
    vi.spyOn(Tour, 'aggregate').mockReturnValue(tourAggregateResult([]));

    const response = await request(app).get('/cavora/tours/999');

    expect(response.status).toBe(HttpCode.NOT_FOUND);
    expect(response.body).toMatchObject({
      code: ErrorCode.TOUR_NOT_FOUND,
      message: 'Tour not found.',
    });
  });
});
