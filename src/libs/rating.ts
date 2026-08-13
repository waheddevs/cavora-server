/**
 * Guest ratings are stored as a five-slot histogram on the tour, ordered from
 * five stars down to one star. The histogram is the source of truth: the tour's
 * `ratingAverage` and `reviewCount` are both derived from it, so the storefront
 * can draw a per-star breakdown that always agrees with the headline figures.
 */
export const RATING_MIN = 1;
export const RATING_MAX = 5;

export type RatingBreakdown = number[];

export function emptyRatingBreakdown(): RatingBreakdown {
  return Array.from({ length: RATING_MAX }, () => 0);
}

export function normalizeRatingBreakdown(counts?: readonly number[] | null): RatingBreakdown {
  const breakdown = emptyRatingBreakdown();
  if (!counts) return breakdown;
  for (let slot = 0; slot < RATING_MAX; slot += 1) {
    const count = counts[slot];
    breakdown[slot] = Number.isFinite(count) && (count as number) > 0 ? Math.round(count!) : 0;
  }
  return breakdown;
}

/** Histogram slot holding a given star value: 5 stars sits first, 1 star last. */
export function ratingSlot(rating: number): number {
  return RATING_MAX - Math.min(Math.max(Math.round(rating), RATING_MIN), RATING_MAX);
}

export function reviewCountFromBreakdown(counts: readonly number[]): number {
  return normalizeRatingBreakdown(counts).reduce((total, count) => total + count, 0);
}

export function averageFromBreakdown(counts: readonly number[]): number {
  const breakdown = normalizeRatingBreakdown(counts);
  const total = breakdown.reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;
  const weighted = breakdown.reduce((sum, count, slot) => sum + count * (RATING_MAX - slot), 0);
  return Math.round((weighted / total) * 10) / 10;
}

/** Star shares for an exponential preference curve; a higher slope favours 5 stars. */
function sharesForSlope(slope: number): number[] {
  const weights = Array.from({ length: RATING_MAX }, (_, index) => Math.exp(slope * index));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => weight / total);
}

function meanForSlope(slope: number): number {
  return sharesForSlope(slope).reduce((mean, share, index) => mean + share * (index + 1), 0);
}

/**
 * Spreads `reviewCount` reviews across the five stars so that their mean lands on
 * `average`. The curve is solved rather than hard-coded, so every tour gets its own
 * shape: a 4.9 tour is nearly all five-star, a 3.2 tour is visibly mixed.
 */
export function buildRatingBreakdown(average: number, reviewCount: number): RatingBreakdown {
  const total = Math.max(Math.round(reviewCount), 0);
  if (total === 0) return emptyRatingBreakdown();

  // The curve cannot reach the extremes, so leave a sliver of room at both ends.
  const target = Math.min(Math.max(average, RATING_MIN + 0.05), RATING_MAX - 0.05);
  let low = -12;
  let high = 12;
  for (let step = 0; step < 60; step += 1) {
    const middle = (low + high) / 2;
    if (meanForSlope(middle) < target) low = middle;
    else high = middle;
  }
  const shares = sharesForSlope((low + high) / 2);

  // Largest-remainder rounding keeps the slots summing to exactly `total`.
  const exact = shares.map((share) => share * total);
  const counts = exact.map((value) => Math.floor(value));
  let remaining = total - counts.reduce((sum, count) => sum + count, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((left, right) => right.remainder - left.remainder || right.index - left.index);
  for (const { index } of byRemainder) {
    if (remaining <= 0) break;
    counts[index] = (counts[index] ?? 0) + 1;
    remaining -= 1;
  }

  return counts.reverse();
}
