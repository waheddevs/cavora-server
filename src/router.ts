import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { optionalAuth, requireAuth } from './common/middleware/auth';
import { requireCsrf, requireCsrfIfAuthenticated } from './common/middleware/csrf';
import {
  accountRecoveryRateLimiter,
  commentRateLimiter,
  contactRateLimiter,
  loginRateLimiter,
  newsletterRateLimiter,
  registrationRateLimiter,
} from './common/middleware/rate-limit';
import blogController from './controllers/blog.controller';
import bookingController from './controllers/booking.controller';
import engagementController from './controllers/engagement.controller';
import homeController from './controllers/home.controller';
import memberController from './controllers/member.controller';
import paymentController from './controllers/payment.controller';
import systemController from './controllers/system.controller';
import tourController from './controllers/tour.controller';
import { validate } from './common/middleware/validate';
import {
  availabilityQuerySchema,
  tourIdParamsSchema,
  tourListQuerySchema,
} from './libs/validators/tour.validator';
import {
  bookingHistoryQuerySchema,
  forgotPasswordBodySchema,
  loginBodySchema,
  profileUpdateBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
  verifyEmailBodySchema,
  wishlistTourParamsSchema,
} from './libs/validators/member.validator';
import { bookingHoldBodySchema, bookingIdParamsSchema } from './libs/validators/booking.validator';
import {
  paymentIntentBodySchema,
  paymentIntentHeadersSchema,
  stripeWebhookHeadersSchema,
} from './libs/validators/payment.validator';
import {
  blogCommentBodySchema,
  blogCommentListQuerySchema,
  blogPostIdParamsSchema,
  blogPostListQuerySchema,
  blogPostSlugParamsSchema,
} from './libs/validators/blog.validator';
import {
  contactMessageBodySchema,
  newsletterSubscriptionBodySchema,
  newsletterUnsubscribeParamsSchema,
} from './libs/validators/engagement.validator';
const router = Router();

/* SYSTEM */
router.get('/health', systemController.getHealth);
router.use('/docs', ...swaggerUi.serveWithOptions({ redirect: false }));
router.get('/docs', systemController.getDocs);
router.get('/openapi.json', systemController.getOpenApiDocument);

/* HOME */
router.get('/home', homeController.getHome);

/* AUTHENTICATION */
router.post(
  '/auth/register',
  registrationRateLimiter,
  validate({ body: registerBodySchema }),
  memberController.register,
);
router.post(
  '/auth/login',
  loginRateLimiter,
  validate({ body: loginBodySchema }),
  memberController.login,
);
router.post('/auth/logout', requireAuth, requireCsrf, memberController.logout);
router.post(
  '/auth/forgot-password',
  accountRecoveryRateLimiter,
  validate({ body: forgotPasswordBodySchema }),
  memberController.forgotPassword,
);
router.post(
  '/auth/reset-password',
  accountRecoveryRateLimiter,
  validate({ body: resetPasswordBodySchema }),
  memberController.resetPassword,
);
router.post(
  '/auth/verify-email',
  accountRecoveryRateLimiter,
  validate({ body: verifyEmailBodySchema }),
  memberController.verifyEmail,
);

/* MEMBERS */
router.get('/users/me', requireAuth, memberController.getProfile);
router.patch(
  '/users/me',
  requireAuth,
  requireCsrf,
  validate({ body: profileUpdateBodySchema }),
  memberController.updateProfile,
);
router.get(
  '/users/me/bookings',
  requireAuth,
  validate({ query: bookingHistoryQuerySchema }),
  memberController.getBookings,
);
router.get('/users/me/wishlist', requireAuth, memberController.getWishlist);
router.put(
  '/users/me/wishlist/:tourId',
  requireAuth,
  requireCsrf,
  validate({ params: wishlistTourParamsSchema }),
  memberController.addWishlistTour,
);
router.delete(
  '/users/me/wishlist/:tourId',
  requireAuth,
  requireCsrf,
  validate({ params: wishlistTourParamsSchema }),
  memberController.removeWishlistTour,
);

/* TOURS & AVAILABILITY */
router.get('/tours', validate({ query: tourListQuerySchema }), tourController.getTours);
router.get(
  '/tours/:id/related',
  validate({ params: tourIdParamsSchema }),
  tourController.getRelatedTours,
);
router.get(
  '/tours/:id/availability',
  validate({ params: tourIdParamsSchema, query: availabilityQuerySchema }),
  tourController.getAvailability,
);
router.get('/tours/:id', validate({ params: tourIdParamsSchema }), tourController.getTour);

/* BOOKINGS */
router.post(
  '/booking-holds',
  requireAuth,
  requireCsrf,
  validate({ body: bookingHoldBodySchema }),
  bookingController.createBookingHold,
);
router.get(
  '/bookings/:id',
  requireAuth,
  validate({ params: bookingIdParamsSchema }),
  bookingController.getBooking,
);
router.post(
  '/bookings/:id/cancel',
  requireAuth,
  requireCsrf,
  validate({ params: bookingIdParamsSchema }),
  bookingController.cancelBooking,
);

/* PAYMENTS */
router.post(
  '/payments/intents',
  requireAuth,
  requireCsrf,
  validate({ body: paymentIntentBodySchema, headers: paymentIntentHeadersSchema }),
  paymentController.createPaymentIntent,
);
router.post(
  '/payments/webhooks/stripe',
  validate({ headers: stripeWebhookHeadersSchema }),
  paymentController.receiveStripeWebhook,
);

/* BLOG */
router.get('/posts', validate({ query: blogPostListQuerySchema }), blogController.getPosts);
router.get('/posts/:slug', validate({ params: blogPostSlugParamsSchema }), blogController.getPost);
router.get(
  '/posts/:id/comments',
  validate({ params: blogPostIdParamsSchema, query: blogCommentListQuerySchema }),
  blogController.getComments,
);
router.post(
  '/posts/:id/comments',
  commentRateLimiter,
  optionalAuth,
  requireCsrfIfAuthenticated,
  validate({ params: blogPostIdParamsSchema, body: blogCommentBodySchema }),
  blogController.submitComment,
);

/* ENGAGEMENT */
router.post(
  '/contact-messages',
  contactRateLimiter,
  optionalAuth,
  requireCsrfIfAuthenticated,
  validate({ body: contactMessageBodySchema }),
  engagementController.submitContactMessage,
);
router.post(
  '/newsletter-subscriptions',
  newsletterRateLimiter,
  validate({ body: newsletterSubscriptionBodySchema }),
  engagementController.subscribeNewsletter,
);
router.delete(
  '/newsletter-subscriptions/:token',
  newsletterRateLimiter,
  validate({ params: newsletterUnsubscribeParamsSchema }),
  engagementController.unsubscribeNewsletter,
);

export default router;
