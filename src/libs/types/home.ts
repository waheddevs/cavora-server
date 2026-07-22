import type { TourSummary } from './tour';

export interface HeroSlide {
  imageUrl: string;
  location: string;
  subtitle: string;
  title: string;
}

export interface GalleryImage {
  altText: string;
  imageUrl: string;
  tall: boolean;
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
