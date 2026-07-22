import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

interface FrontendItineraryItem {
  text: string;
  title: string;
}

interface FrontendTour {
  country: string;
  days: string;
  group: string;
  highlights: string[];
  id: number;
  images: string[];
  included: string[];
  itinerary: FrontendItineraryItem[];
  location: string;
  notIncluded: string[];
  oldPrice: number;
  overview: string;
  place: string;
  price: number;
  rating: number;
  reviews: number;
  title: string;
  type: string;
}

interface TourModule {
  tours: FrontendTour[];
}

interface HomeModule {
  featuredTourIds: number[];
  popularTourIds: number[];
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseFirstInteger(value: string, field: string, tourId: number): number {
  const match = value.match(/\d+/);
  if (!match) throw new Error(`Tour ${tourId} has an invalid ${field}: ${value}`);
  return Number(match[0]);
}

async function generateTourSeed(): Promise<void> {
  const frontendRoot = path.resolve(process.argv[2] ?? path.join('..', 'cavora-react'));
  const tourSource = path.join(frontendRoot, 'src', 'ts', 'TourSingle.ts');
  const homeSource = path.join(frontendRoot, 'src', 'ts', 'Home.ts');
  const output = path.resolve('src', 'data', 'tours.seed.json');

  const tourModule = (await import(pathToFileURL(tourSource).href)) as TourModule;
  const homeModule = (await import(pathToFileURL(homeSource).href)) as HomeModule;
  const featuredRanks = new Map(homeModule.featuredTourIds.map((id, index) => [id, index + 1]));
  const popularityRanks = new Map(homeModule.popularTourIds.map((id, index) => [id, index + 1]));
  const publishedAt = '2026-01-01T00:00:00.000Z';

  const tours = tourModule.tours.map((tour) => ({
    _id: tour.id,
    slug: slugify(tour.title),
    country: tour.country,
    place: tour.place,
    title: tour.title,
    location: tour.location,
    type: tour.type,
    priceCents: tour.price * 100,
    oldPriceCents: tour.oldPrice * 100,
    currency: 'USD',
    ratingAverage: tour.rating,
    reviewCount: tour.reviews,
    durationDays: parseFirstInteger(tour.days, 'days', tour.id),
    maxGroupSize: parseFirstInteger(tour.group, 'group', tour.id),
    overview: tour.overview,
    highlights: tour.highlights,
    itinerary: tour.itinerary.map((item, index) => ({
      day: index + 1,
      title: item.title,
      description: item.text,
    })),
    included: tour.included,
    notIncluded: tour.notIncluded,
    status: 'PUBLISHED',
    featuredRank: featuredRanks.get(tour.id),
    popularityRank: popularityRanks.get(tour.id),
    publishedAt,
  }));

  const tourImages = tourModule.tours.flatMap((tour) =>
    tour.images.map((url, position) => ({
      tourId: tour.id,
      url,
      altText: `${tour.title} image ${position + 1}`,
      position,
    })),
  );

  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify({ tours, tourImages }, null, 2)}\n`, 'utf8');
  console.log(`Generated ${tours.length} tours and ${tourImages.length} images at ${output}`);
}

void generateTourSeed().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
