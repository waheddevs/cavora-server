import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { requireAuth } from './common/middleware/auth';
import { requireCsrf } from './common/middleware/csrf';
import {
  accountRecoveryRateLimiter,
  loginRateLimiter,
  registrationRateLimiter,
} from './common/middleware/rate-limit';
import homeController from './controllers/home.controller';
import memberController from './controllers/member.controller';
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

/* WISHLISTS */

/* BOOKINGS */

/* PAYMENTS */

/* BLOG */

/* ENGAGEMENT */

/* ADMINISTRATION */

export default router;
