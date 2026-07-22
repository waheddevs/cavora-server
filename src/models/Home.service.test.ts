import { afterEach, describe, expect, it, vi } from 'vitest';
import Tour from '../schema/Tour.model';
import HomeService from './Home.service';

function aggregateResult(value: unknown) {
  return {
    exec: vi.fn().mockResolvedValue(value),
  } as unknown as ReturnType<typeof Tour.aggregate>;
}

describe('HomeService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('loads dynamic homepage tours in one aggregation and sorts configured ranks', async () => {
    const rows = [
      { id: 5, featuredRank: 2, images: [] },
      { id: 18, images: [] },
      { id: 1, featuredRank: 1, popularityRank: 2, images: [] },
      { id: 25, popularityRank: 1, images: [] },
    ];
    const aggregate = vi.spyOn(Tour, 'aggregate').mockReturnValue(aggregateResult(rows));

    const result = await new HomeService().getHome();

    expect(aggregate).toHaveBeenCalledTimes(1);
    expect(result.featuredTours.map((tour) => tour.id)).toEqual([1, 5]);
    expect(result.popularTours.map((tour) => tour.id)).toEqual([25, 1]);
    expect(result.spotlight.tour?.id).toBe(18);
    expect(result.slides).toHaveLength(5);
    expect(result.gallery).toHaveLength(5);
  });
});
