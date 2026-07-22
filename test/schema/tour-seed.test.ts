import { describe, expect, it } from 'vitest';
import seedData from '../../src/data/tours.seed.json';

describe('tour seed data', () => {
  it('contains all 28 stable frontend tour IDs and their images', () => {
    expect(seedData.tours).toHaveLength(28);
    expect(seedData.tourImages).toHaveLength(84);
    expect(seedData.tours.map((tour) => tour._id)).toEqual(
      Array.from({ length: 28 }, (_, index) => index + 1),
    );
  });

  it('uses unique slugs, integer cents, and complete itinerary mappings', () => {
    const slugs = seedData.tours.map((tour) => tour.slug);

    expect(new Set(slugs).size).toBe(28);
    for (const tour of seedData.tours) {
      expect(Number.isInteger(tour.priceCents)).toBe(true);
      expect(Number.isInteger(tour.oldPriceCents)).toBe(true);
      expect(tour.currency).toBe('USD');
      expect(tour.durationDays).toBeGreaterThan(0);
      expect(tour.maxGroupSize).toBeGreaterThan(0);
      expect(tour.itinerary.length).toBe(tour.durationDays);
      expect(tour.status).toBe('PUBLISHED');
    }
  });

  it('preserves homepage featured and popular rankings', () => {
    expect(
      seedData.tours
        .filter((tour) => tour.featuredRank !== undefined)
        .sort((left, right) => (left.featuredRank ?? 0) - (right.featuredRank ?? 0))
        .map((tour) => tour._id),
    ).toEqual([1, 13, 17, 24]);

    expect(
      seedData.tours
        .filter((tour) => tour.popularityRank !== undefined)
        .sort((left, right) => (left.popularityRank ?? 0) - (right.popularityRank ?? 0))
        .map((tour) => tour._id),
    ).toEqual([5, 19, 25]);
  });
});
