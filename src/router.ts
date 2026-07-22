import { Router } from 'express';
import homeController from './controllers/home.controller';
import systemController from './controllers/system.controller';
import tourController from './controllers/tour.controller';
import { validate } from './common/middleware/validate';
import {
  availabilityQuerySchema,
  tourIdParamsSchema,
  tourListQuerySchema,
} from './libs/validators/tour.validator';

const router = Router();

/* SYSTEM */
router.get('/health', systemController.getHealth);

/* HOME */
router.get('/home', homeController.getHome);

/* AUTHENTICATION */

/* MEMBERS */

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
