import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { optionalAuth, requireAdmin, requireAuth } from './common/middleware/auth';
import { requireCsrf, requireCsrfIfAuthenticated } from './common/middleware/csrf';
import {
  accountRecoveryRateLimiter,
  contactRateLimiter,
  loginRateLimiter,
  newsletterRateLimiter,
  registrationRateLimiter,
} from './common/middleware/rate-limit';
import blogController from './controllers/blog.controller';
import bookingController from './controllers/booking.controller';
import engagementController from './controllers/engagement.controller';
import homeController from './controllers/home.controller';
import faqController from './controllers/faq.controller';
import memberController from './controllers/member.controller';
import paymentController from './controllers/payment.controller';
import systemController from './controllers/system.controller';
import tourController from './controllers/tour.controller';
import { validate } from './common/middleware/validate';
import { uploadAccountImage, uploadImage } from './common/middleware/upload';
import {
  availabilityQuerySchema,
  tourIdParamsSchema,
  tourListQuerySchema,
  tourViewBodySchema,
} from './libs/validators/tour.validator';
import {
  adminRegisterBodySchema,
  bookingHistoryQuerySchema,
  forgotPasswordBodySchema,
  loginBodySchema,
  passwordChangeBodySchema,
  profileUpdateBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
  verifyEmailBodySchema,
  wishlistTourParamsSchema,
} from './libs/validators/member.validator';
import {
  bookingArchiveBodySchema,
  bookingHoldBodySchema,
  bookingIdParamsSchema,
} from './libs/validators/booking.validator';
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
} from './libs/validators/engagement.validator';
import adminController from './controllers/admin.controller';
import {
  adminBlogPostCreateBodySchema,
  adminBlogPostListQuerySchema,
  adminBlogPostUpdateBodySchema,
  adminBookingListQuerySchema,
  adminBookingStatusBodySchema,
  adminCommentListQuerySchema,
  adminCommentStatusBodySchema,
  adminContactListQuerySchema,
  adminContactStatusBodySchema,
  adminDepartureCreateBodySchema,
  adminDepartureListQuerySchema,
  adminDepartureUpdateBodySchema,
  adminFaqCreateBodySchema,
  adminFaqListQuerySchema,
  adminFaqUpdateBodySchema,
  adminHomepageSelectionsBodySchema,
  adminMemberListQuerySchema,
  adminMemberStatusBodySchema,
  adminObjectIdParamsSchema,
  adminPaymentListQuerySchema,
  adminRefundBodySchema,
  adminTourCreateBodySchema,
  adminTourIdParamsSchema,
  adminTourImageBodySchema,
  adminTourImageParamsSchema,
  adminTourImageUploadBodySchema,
  adminTourListQuerySchema,
  adminTourUpdateBodySchema,
} from './libs/validators/admin.validator';
const router = Router();

/* SYSTEM */
router.get('/health', systemController.getHealth);
router.use('/docs', ...swaggerUi.serveWithOptions({ redirect: false }));
router.get('/docs', systemController.getDocs);
router.get('/openapi.json', systemController.getOpenApiDocument);

/* HOME */
router.get('/home', homeController.getHome);
router.get('/faqs', faqController.getFaqs);

/* AUTHENTICATION */
router.post(
  '/auth/register',
  registrationRateLimiter,
  validate({ body: registerBodySchema }),
  memberController.register,
);
router.post(
  '/auth/admin-register',
  registrationRateLimiter,
  validate({ body: adminRegisterBodySchema }),
  memberController.registerAdmin,
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
router.post(
  '/users/me/password',
  requireAuth,
  requireCsrf,
  validate({ body: passwordChangeBodySchema }),
  memberController.changePassword,
);
router.post(
  '/users/me/avatar',
  requireAuth,
  requireCsrf,
  uploadAccountImage('image'),
  memberController.uploadAvatar,
);
router.delete('/users/me/avatar', requireAuth, requireCsrf, memberController.removeAvatar);
router.get(
  '/users/me/bookings',
  requireAuth,
  validate({ query: bookingHistoryQuerySchema }),
  memberController.getBookings,
);
router.patch(
  '/users/me/bookings/archive',
  requireAuth,
  requireCsrf,
  validate({ body: bookingArchiveBodySchema }),
  memberController.archiveBookings,
);
router.get('/users/me/wishlist', requireAuth, memberController.getWishlist);
router.delete('/users/me/wishlist', requireAuth, requireCsrf, memberController.clearWishlist);
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
router.get(
  '/tours/:id/comments',
  validate({ params: tourIdParamsSchema, query: blogCommentListQuerySchema }),
  tourController.getComments,
);
router.post(
  '/tours/:id/comments',
  optionalAuth,
  requireCsrfIfAuthenticated,
  validate({ params: tourIdParamsSchema, body: blogCommentBodySchema }),
  tourController.submitComment,
);
router.post(
  '/tours/:id/views',
  optionalAuth,
  requireCsrfIfAuthenticated,
  validate({ params: tourIdParamsSchema, body: tourViewBodySchema }),
  tourController.recordView,
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
  optionalAuth,
  requireCsrfIfAuthenticated,
  validate({ body: newsletterSubscriptionBodySchema }),
  engagementController.subscribeToNewsletter,
);

/* ADMINISTRATION */
router.use('/admin', requireAuth, requireAdmin);

/* ADMINISTRATION: TOURS & IMAGES */
router.get('/admin/tours', validate({ query: adminTourListQuerySchema }), adminController.getTours);
router.get(
  '/admin/tours/:id',
  validate({ params: adminTourIdParamsSchema }),
  adminController.getTour,
);
router.post(
  '/admin/tours',
  requireCsrf,
  validate({ body: adminTourCreateBodySchema }),
  adminController.createTour,
);
router.patch(
  '/admin/tours/:id',
  requireCsrf,
  validate({ params: adminTourIdParamsSchema, body: adminTourUpdateBodySchema }),
  adminController.updateTour,
);
router.delete(
  '/admin/tours/:id',
  requireCsrf,
  validate({ params: adminTourIdParamsSchema }),
  adminController.deleteTour,
);
router.post(
  '/admin/tours/:id/images',
  requireCsrf,
  uploadImage('tours', 'image'),
  validate({ params: adminTourIdParamsSchema, body: adminTourImageUploadBodySchema }),
  adminController.uploadTourImage,
);
router.put(
  '/admin/tours/:id/images/:position',
  requireCsrf,
  uploadImage('tours', 'image'),
  validate({ params: adminTourImageParamsSchema, body: adminTourImageBodySchema }),
  adminController.upsertTourImage,
);
router.delete(
  '/admin/tours/:id/images/:position',
  requireCsrf,
  validate({ params: adminTourImageParamsSchema }),
  adminController.deleteTourImage,
);

/* ADMINISTRATION: DEPARTURES */
router.get(
  '/admin/departures',
  validate({ query: adminDepartureListQuerySchema }),
  adminController.getDepartures,
);
router.post(
  '/admin/tours/:id/departures',
  requireCsrf,
  validate({ params: adminTourIdParamsSchema, body: adminDepartureCreateBodySchema }),
  adminController.createDeparture,
);
router.patch(
  '/admin/departures/:id',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema, body: adminDepartureUpdateBodySchema }),
  adminController.updateDeparture,
);
router.delete(
  '/admin/departures/:id',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema }),
  adminController.deleteDeparture,
);

/* ADMINISTRATION: HOMEPAGE */
router.get('/admin/homepage/selections', adminController.getHomepageSelections);
router.put(
  '/admin/homepage/selections',
  requireCsrf,
  validate({ body: adminHomepageSelectionsBodySchema }),
  adminController.updateHomepageSelections,
);

/* ADMINISTRATION: FAQ */
router.get('/admin/faqs', validate({ query: adminFaqListQuerySchema }), adminController.getFaqs);
router.post(
  '/admin/faqs',
  requireCsrf,
  validate({ body: adminFaqCreateBodySchema }),
  adminController.createFaq,
);
router.patch(
  '/admin/faqs/:id',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema, body: adminFaqUpdateBodySchema }),
  adminController.updateFaq,
);
router.delete(
  '/admin/faqs/:id',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema }),
  adminController.deleteFaq,
);

/* ADMINISTRATION: BLOG */
router.get(
  '/admin/posts',
  validate({ query: adminBlogPostListQuerySchema }),
  adminController.getBlogPosts,
);
router.post(
  '/admin/posts',
  requireCsrf,
  uploadImage('blog', 'image'),
  validate({ body: adminBlogPostCreateBodySchema }),
  adminController.createBlogPost,
);
router.patch(
  '/admin/posts/:id',
  requireCsrf,
  uploadImage('blog', 'image'),
  validate({ params: adminObjectIdParamsSchema, body: adminBlogPostUpdateBodySchema }),
  adminController.updateBlogPost,
);
router.delete(
  '/admin/posts/:id',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema }),
  adminController.deleteBlogPost,
);
router.get(
  '/admin/comments',
  validate({ query: adminCommentListQuerySchema }),
  adminController.getComments,
);
router.patch(
  '/admin/comments/:id/status',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema, body: adminCommentStatusBodySchema }),
  adminController.moderateComment,
);
router.delete(
  '/admin/comments/:id',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema }),
  adminController.deleteComment,
);

/* ADMINISTRATION: CONTACT MESSAGES */
router.get(
  '/admin/contact-messages',
  validate({ query: adminContactListQuerySchema }),
  adminController.getContactMessages,
);
router.patch(
  '/admin/contact-messages/:id/status',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema, body: adminContactStatusBodySchema }),
  adminController.updateContactStatus,
);
router.delete(
  '/admin/contact-messages/:id',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema }),
  adminController.deleteContactMessage,
);

/* ADMINISTRATION: BOOKINGS */
router.get(
  '/admin/bookings',
  validate({ query: adminBookingListQuerySchema }),
  adminController.getBookings,
);
router.patch(
  '/admin/bookings/:id/status',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema, body: adminBookingStatusBodySchema }),
  adminController.updateBookingStatus,
);
router.delete(
  '/admin/bookings/:id',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema }),
  adminController.deleteBooking,
);

/* ADMINISTRATION: PAYMENTS & REFUNDS */
router.get(
  '/admin/payments',
  validate({ query: adminPaymentListQuerySchema }),
  adminController.getPayments,
);
router.post(
  '/admin/payments/:id/refunds',
  requireCsrf,
  validate({
    params: adminObjectIdParamsSchema,
    headers: paymentIntentHeadersSchema,
    body: adminRefundBodySchema,
  }),
  adminController.refundPayment,
);

/* ADMINISTRATION: MEMBERS */
router.get(
  '/admin/users',
  validate({ query: adminMemberListQuerySchema }),
  adminController.getMembers,
);
router.patch(
  '/admin/users/:id/status',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema, body: adminMemberStatusBodySchema }),
  adminController.updateMemberStatus,
);

export default router;
