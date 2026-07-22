import type { PipelineStage } from 'mongoose';
import { galleryImages, heroSlides, spotlightContent } from '../data/home.data';
import type { HomeResult } from '../libs/types/home';
import { TourStatus } from '../libs/enums/tour.enum';
import type { TourSummary } from '../libs/types/tour';
import Tour from '../schema/Tour.model';

interface HomeTour extends TourSummary {
  featuredRank?: number;
  popularityRank?: number;
}

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
    durationDays: tour.durationDays,
    maxGroupSize: tour.maxGroupSize,
    images: tour.images,
  };
}

class HomeService {
  public async getHome(): Promise<HomeResult> {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          status: TourStatus.PUBLISHED,
          $or: [
            { featuredRank: { $exists: true } },
            { popularityRank: { $exists: true } },
            { _id: spotlightContent.tourId },
          ],
        },
      },
      {
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
      },
      {
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
          durationDays: 1,
          maxGroupSize: 1,
          images: 1,
          featuredRank: 1,
          popularityRank: 1,
        },
      },
    ];
    const tours = await Tour.aggregate<HomeTour>(pipeline).exec();
    const featuredTours = tours
      .filter((tour) => tour.featuredRank !== undefined)
      .sort((left, right) => (left.featuredRank ?? 0) - (right.featuredRank ?? 0))
      .map(toTourSummary);
    const popularTours = tours
      .filter((tour) => tour.popularityRank !== undefined)
      .sort((left, right) => (left.popularityRank ?? 0) - (right.popularityRank ?? 0))
      .map(toTourSummary);
    const spotlight = tours.find((tour) => tour.id === spotlightContent.tourId);
    const spotlightTour = spotlight ? toTourSummary(spotlight) : null;

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
      gallery: galleryImages,
    };
  }
}

export default HomeService;
