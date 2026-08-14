import type { PipelineStage } from 'mongoose';
import { galleryImages, heroSlides, spotlightContent } from '../data/home.data';
import type { HomeResult } from '../libs/types/home';
import { TourStatus } from '../libs/enums/tour.enum';
import type { TourSummary } from '../libs/types/tour';
import Tour from '../schema/Tour.model';

// "Discover Tours" on the storefront shows the newest published tours, so it fills
// its four cards straight from `publishedAt` instead of a curated rank.
const LATEST_TOUR_LIMIT = 4;

interface HomeTour extends TourSummary {
  homepageSpotlight?: boolean;
  popularityRank?: number;
}

const imageLookupStage: PipelineStage = {
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

const tourProjectStage: PipelineStage = {
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
    homepageSpotlight: 1,
    popularityRank: 1,
  },
};

function toTourSummary(tour: HomeTour): TourSummary {
  return {
    id: tour.id,
    slug: tour.slug,
    country: tour.country,
    place: tour.place,
    title: tour.title,
    location: tour.location,
    type: tour.type,
    priceCents: tour.priceCents,
    oldPriceCents: tour.oldPriceCents,
    currency: tour.currency,
    ratingAverage: tour.ratingAverage,
    reviewCount: tour.reviewCount,
    viewCount: tour.viewCount,
    durationDays: tour.durationDays,
    maxGroupSize: tour.maxGroupSize,
    images: tour.images,
  };
}

class HomeService {
  public async getHome(): Promise<HomeResult> {
    const galleryTourSlugs = galleryImages.map((image) => image.tourSlug);
    const selectionPipeline: PipelineStage[] = [
      {
        $match: {
          status: TourStatus.PUBLISHED,
          $or: [
            { popularityRank: { $exists: true } },
            { homepageSpotlight: true },
            { slug: spotlightContent.tourSlug },
            { slug: { $in: galleryTourSlugs } },
          ],
        },
      },
      imageLookupStage,
      tourProjectStage,
    ];
    const latestPipeline: PipelineStage[] = [
      { $match: { status: TourStatus.PUBLISHED } },
      { $sort: { publishedAt: -1, _id: -1 } },
      { $limit: LATEST_TOUR_LIMIT },
      imageLookupStage,
      tourProjectStage,
    ];
    const [tours, latestTours] = await Promise.all([
      Tour.aggregate<HomeTour>(selectionPipeline).exec(),
      Tour.aggregate<HomeTour>(latestPipeline).exec(),
    ]);
    const featuredTours = latestTours.map(toTourSummary);
    const popularTours = tours
      .filter((tour) => tour.popularityRank !== undefined)
      .sort((left, right) => (left.popularityRank ?? 0) - (right.popularityRank ?? 0))
      .map(toTourSummary);
    const spotlight =
      tours.find((tour) => tour.homepageSpotlight) ??
      tours.find((tour) => tour.slug === spotlightContent.tourSlug);
    const spotlightTour = spotlight ? toTourSummary(spotlight) : null;
    const gallery = galleryImages.flatMap(({ tourSlug, ...image }) => {
      const tour = tours.find((candidate) => candidate.slug === tourSlug);
      return tour ? [{ ...image, tourId: tour.id }] : [];
    });

    return {
      slides: heroSlides,
      featuredTours,
      popularTours,
      spotlight: {
        imageUrl: spotlightContent.imageUrl,
        tagline: spotlightContent.tagline,
        title: spotlightContent.title,
        subtitle: spotlightContent.subtitle,
        tour: spotlightTour,
      },
      gallery,
    };
  }
}

export default HomeService;
