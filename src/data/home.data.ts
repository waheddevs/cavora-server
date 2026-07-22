import type { GalleryImage, HeroSlide } from '../libs/types/home';

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

export const galleryImages: GalleryImage[] = [
  {
    imageUrl: '/img/home-page-img/hero.jpg',
    altText: 'Snowy peaks above the clouds',
    tall: true,
  },
  {
    imageUrl: '/img/home-page-img/gallery-1.jpg',
    altText: 'Aerial view of Rome',
    tall: false,
  },
  {
    imageUrl: '/img/home-page-img/gallery-2.jpg',
    altText: 'Taj Mahal through an archway',
    tall: false,
  },
  {
    imageUrl: '/img/home-page-img/tour-safari.jpg',
    altText: 'Wooden boat on an alpine lake',
    tall: false,
  },
  {
    imageUrl: '/img/home-page-img/tour-santorini.jpg',
    altText: 'Pyramids of Giza',
    tall: false,
  },
];

export const spotlightContent = {
  tourId: 18,
  imageUrl: '/img/home-page-img/tour-kyoto.jpg',
  tagline: 'Hidden Gem',
  title: 'Explore Ancient Kyoto',
  subtitle:
    'Journey to the heart of old Japan. Discover hidden temples, serene bamboo groves, and centuries of timeless tradition.',
} as const;
