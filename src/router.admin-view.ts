import { Router } from 'express';
import { redirectAdminLogin } from './common/middleware/admin-view-auth';
import { requireAdmin, requireAuth } from './common/middleware/auth';
import adminViewController from './controllers/admin-view.controller';

const adminViewRouter = Router();

adminViewRouter.get('/login', adminViewController.getLogin);
adminViewRouter.get('/signup', adminViewController.getSignup);

adminViewRouter.use(requireAuth, requireAdmin);

adminViewRouter.get('/', adminViewController.getDashboard);
adminViewRouter.get('/profile', adminViewController.getProfile);
adminViewRouter.get('/tours', adminViewController.getTours);
adminViewRouter.get('/departures', adminViewController.getDepartures);
adminViewRouter.get('/posts', adminViewController.getPosts);
adminViewRouter.get('/comments', adminViewController.getComments);
adminViewRouter.get('/contact-messages', adminViewController.getContactMessages);
adminViewRouter.get('/bookings', adminViewController.getBookings);
adminViewRouter.get('/payments', adminViewController.getPayments);
adminViewRouter.get('/users', adminViewController.getUsers);

adminViewRouter.use(redirectAdminLogin);

export default adminViewRouter;
