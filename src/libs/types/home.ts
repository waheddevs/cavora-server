import type { TourSummary } from './tour';

export interface HeroSlide {
  imageUrl: string;
  location: string;
  subtitle: string;
  title: string;
}

export interface GalleryImage {
  altText: string;
  category: string;
  imageUrl: string;
  location: string;
  tall: boolean;
  title: string;
  tourId: number;
}

export interface HomeSpotlight {
  imageUrl: string;
  subtitle: string;
  tagline: string;
  title: string;
  tour: TourSummary | null;
}

export interface HomeResult {
  slides: HeroSlide[];
  featuredTours: TourSummary[];
  popularTours: TourSummary[];
  spotlight: HomeSpotlight;
  gallery: GalleryImage[];
}
