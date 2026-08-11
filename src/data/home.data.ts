import type { GalleryImage, HeroSlide } from '../libs/types/home';

export interface GalleryImageSource extends Omit<GalleryImage, 'tourId'> {
  tourSlug: string;
}

export const heroSlides: HeroSlide[] = [
  {
    imageUrl: '/img/slide-img/slide-1.jpg',
    location: 'Zermatt, Switzerland',
    title: 'Alpine Heights',
    subtitle: 'Rise above the clouds and watch the sunset set the snow-capped Swiss peaks aglow.',
  },
  {
    imageUrl: '/img/slide-img/slide-2.jpg',
    location: 'Krabi, Thailand',
    title: 'Tropical Escape',
    subtitle: 'Unwind beside turquoise pools framed by jungle cliffs and swaying palm trees.',
  },
  {
    imageUrl: '/img/slide-img/slide-3.jpg',
    location: 'Paris, France',
    title: 'Parisian Charm',
    subtitle: 'Drift along the Seine and fall for the timeless elegance of the Eiffel Tower.',
  },
  {
    imageUrl: '/img/slide-img/slide-4.jpg',
    location: 'Bali, Indonesia',
    title: 'Island Dreams',
    subtitle: 'Immerse yourself in lush rice terraces, ancient temples, and Balinese culture.',
  },
  {
    imageUrl: '/img/slide-img/slide-5.jpg',
    location: 'Utah, USA',
    title: 'Desert Trails',
    subtitle: 'Hit the open road and chase adventure through canyons of red desert rock.',
  },
];

export const galleryImages: GalleryImageSource[] = [
  {
    imageUrl: '/img/home-page-img/hero.jpg',
    altText: 'Snowy peaks above the clouds',
    title: 'Above the Clouds',
    location: 'Jungfrau Region, Switzerland',
    category: 'Adventure',
    tourSlug: 'jungfraujoch-top-of-europe',
    tall: true,
  },
  {
    imageUrl: '/img/home-page-img/gallery-1.jpg',
    altText: 'Aerial view of Rome',
    title: 'Rome From Above',
    location: 'Rome, Italy',
    category: 'Cultural',
    tourSlug: 'rome-ancient-wonders-la-dolce-vita',
    tall: false,
  },
  {
    imageUrl: '/img/tour-single/japan-kyoto-1.jpg',
    altText: 'Historic Kyoto temple surrounded by nature',
    title: 'Timeless Kyoto',
    location: 'Kyoto, Japan',
    category: 'Cultural',
    tourSlug: 'kyoto-temples-bamboo-groves',
    tall: false,
  },
  {
    imageUrl: '/img/home-page-img/tour-safari.jpg',
    altText: 'Wooden boat on an alpine lake',
    title: 'Alpine Lake Escape',
    location: 'Lucerne, Switzerland',
    category: 'Scenic',
    tourSlug: 'lucerne-lake-old-town',
    tall: false,
  },
  {
    imageUrl: '/img/tour-single/maldives-ari-1.jpg',
    altText: 'Overwater villas in the turquoise Indian Ocean',
    title: 'Indian Ocean Dreams',
    location: 'Ari Atoll, Maldives',
    category: 'Beach',
    tourSlug: 'ari-atoll-overwater-luxury',
    tall: false,
  },
];

export const spotlightContent = {
  tourSlug: 'kyoto-temples-bamboo-groves',
  imageUrl: '/img/home-page-img/tour-kyoto.jpg',
  tagline: 'Hidden Gem',
  title: 'Explore Ancient Kyoto',
  subtitle:
    'Journey to the heart of old Japan. Discover hidden temples, serene bamboo groves, and centuries of timeless tradition.',
} as const;
