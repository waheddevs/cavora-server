import { Router } from 'express';
import { requireAdmin, requireAuth } from './common/middleware/auth';
import { requireCsrf } from './common/middleware/csrf';
import { validate } from './common/middleware/validate';
import adminController from './controllers/admin.controller';
import {
  adminBlogPostCreateBodySchema,
  adminBlogPostUpdateBodySchema,
  adminBookingListQuerySchema,
  adminBookingStatusBodySchema,
  adminCommentStatusBodySchema,
  adminContactListQuerySchema,
  adminContactStatusBodySchema,
  adminDepartureCreateBodySchema,
  adminDepartureUpdateBodySchema,
  adminHomepageSelectionsBodySchema,
  adminNewsletterListQuerySchema,
  adminNewsletterStatusBodySchema,
  adminObjectIdParamsSchema,
  adminPaymentListQuerySchema,
  adminRefundBodySchema,
  adminTourCreateBodySchema,
  adminTourIdParamsSchema,
  adminTourImageBodySchema,
  adminTourImageParamsSchema,
  adminTourUpdateBodySchema,
} from './libs/validators/admin.validator';
import { paymentIntentHeadersSchema } from './libs/validators/payment.validator';

const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

/* TOURS & IMAGES */
adminRouter.post(
  '/tours',
  requireCsrf,
  validate({ body: adminTourCreateBodySchema }),
  adminController.createTour,
);
adminRouter.patch(
  '/tours/:id',
  requireCsrf,
  validate({ params: adminTourIdParamsSchema, body: adminTourUpdateBodySchema }),
  adminController.updateTour,
);
adminRouter.put(
  '/tours/:id/images/:position',
  requireCsrf,
  validate({ params: adminTourImageParamsSchema, body: adminTourImageBodySchema }),
  adminController.upsertTourImage,
);
adminRouter.delete(
  '/tours/:id/images/:position',
  requireCsrf,
  validate({ params: adminTourImageParamsSchema }),
  adminController.deleteTourImage,
);

/* DEPARTURES */
adminRouter.post(
  '/tours/:id/departures',
  requireCsrf,
  validate({ params: adminTourIdParamsSchema, body: adminDepartureCreateBodySchema }),
  adminController.createDeparture,
);
adminRouter.patch(
  '/departures/:id',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema, body: adminDepartureUpdateBodySchema }),
  adminController.updateDeparture,
);

/* HOMEPAGE */
adminRouter.put(
  '/homepage/selections',
  requireCsrf,
  validate({ body: adminHomepageSelectionsBodySchema }),
  adminController.updateHomepageSelections,
);

/* BLOG */
adminRouter.post(
  '/posts',
  requireCsrf,
  validate({ body: adminBlogPostCreateBodySchema }),
  adminController.createBlogPost,
);
adminRouter.patch(
  '/posts/:id',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema, body: adminBlogPostUpdateBodySchema }),
  adminController.updateBlogPost,
);
adminRouter.patch(
  '/comments/:id/status',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema, body: adminCommentStatusBodySchema }),
  adminController.moderateComment,
);

/* CONTACT MESSAGES */
adminRouter.get(
  '/contact-messages',
  validate({ query: adminContactListQuerySchema }),
  adminController.getContactMessages,
);
adminRouter.patch(
  '/contact-messages/:id/status',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema, body: adminContactStatusBodySchema }),
  adminController.updateContactStatus,
);

/* NEWSLETTER */
adminRouter.get(
  '/newsletter-subscriptions',
  validate({ query: adminNewsletterListQuerySchema }),
  adminController.getNewsletterSubscriptions,
);
adminRouter.patch(
  '/newsletter-subscriptions/:id/status',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema, body: adminNewsletterStatusBodySchema }),
  adminController.updateNewsletterStatus,
);

/* BOOKINGS */
adminRouter.get(
  '/bookings',
  validate({ query: adminBookingListQuerySchema }),
  adminController.getBookings,
);
adminRouter.patch(
  '/bookings/:id/status',
  requireCsrf,
  validate({ params: adminObjectIdParamsSchema, body: adminBookingStatusBodySchema }),
  adminController.updateBookingStatus,
);

/* PAYMENTS & REFUNDS */
adminRouter.get(
  '/payments',
  validate({ query: adminPaymentListQuerySchema }),
  adminController.getPayments,
);
adminRouter.post(
  '/payments/:id/refunds',
  requireCsrf,
  validate({
    params: adminObjectIdParamsSchema,
    headers: paymentIntentHeadersSchema,
    body: adminRefundBodySchema,
  }),
  adminController.refundPayment,
);

export default adminRouter;
