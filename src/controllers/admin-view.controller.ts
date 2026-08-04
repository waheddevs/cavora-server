import type { NextFunction, Request, Response } from 'express';
import { HttpCode } from '../common/errors/error-codes';
import { env } from '../config/env';

interface AdminPageOptions {
  activePage: string;
  layoutMode?: 'admin' | 'auth';
  pageTitle: string;
  scriptName: string;
  viewName: string;
}

function renderAdminPage(res: Response, options: AdminPageOptions): void {
  const viewFolder = options.layoutMode === 'auth' ? 'auth' : 'admin';

  res.set('Cache-Control', 'private, no-store');
  res.status(HttpCode.OK).render(`${viewFolder}/${options.viewName}`, {
    activePage: options.activePage,
    csrfCookieName: env.CSRF_COOKIE_NAME,
    layoutMode: options.layoutMode ?? 'admin',
    pageTitle: options.pageTitle,
    scriptPath: `/assets/js/${options.scriptName}.js`,
    stylesheetPath: `/assets/css/${options.scriptName}.css`,
  });
}

const adminViewController = {
  async getLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getAdminLogin');
      renderAdminPage(res, {
        activePage: 'login',
        layoutMode: 'auth',
        pageTitle: 'Sign in',
        scriptName: 'login',
        viewName: 'login',
      });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getAdminLogin');
      next(err);
    }
  },

  async getSignup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getAdminSignup');
      renderAdminPage(res, {
        activePage: 'signup',
        layoutMode: 'auth',
        pageTitle: 'Create administrator',
        scriptName: 'signup',
        viewName: 'signup',
      });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getAdminSignup');
      next(err);
    }
  },

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getAdminDashboard');
      renderAdminPage(res, {
        activePage: 'dashboard',
        pageTitle: 'Dashboard',
        scriptName: 'dashboard',
        viewName: 'dashboard',
      });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getAdminDashboard');
      next(err);
    }
  },

  async getTours(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getAdminTours');
      renderAdminPage(res, {
        activePage: 'tours',
        pageTitle: 'Tours',
        scriptName: 'tours',
        viewName: 'tours',
      });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getAdminTours');
      next(err);
    }
  },

  async getDepartures(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getAdminDepartures');
      renderAdminPage(res, {
        activePage: 'departures',
        pageTitle: 'Departures',
        scriptName: 'departures',
        viewName: 'departures',
      });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getAdminDepartures');
      next(err);
    }
  },

  async getHomepage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getAdminHomepage');
      renderAdminPage(res, {
        activePage: 'homepage',
        pageTitle: 'Homepage',
        scriptName: 'homepage',
        viewName: 'homepage',
      });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getAdminHomepage');
      next(err);
    }
  },

  async getPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getAdminPosts');
      renderAdminPage(res, {
        activePage: 'posts',
        pageTitle: 'Blog posts',
        scriptName: 'posts',
        viewName: 'posts',
      });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getAdminPosts');
      next(err);
    }
  },

  async getComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getAdminComments');
      renderAdminPage(res, {
        activePage: 'comments',
        pageTitle: 'Comment moderation',
        scriptName: 'comments',
        viewName: 'comments',
      });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getAdminComments');
      next(err);
    }
  },

  async getContactMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getAdminContactMessages');
      renderAdminPage(res, {
        activePage: 'contact-messages',
        pageTitle: 'Contact messages',
        scriptName: 'contact-messages',
        viewName: 'contact-messages',
      });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getAdminContactMessages');
      next(err);
    }
  },

  async getNewsletterSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getAdminNewsletterSubscriptions');
      renderAdminPage(res, {
        activePage: 'newsletter-subscriptions',
        pageTitle: 'Newsletter',
        scriptName: 'newsletter-subscriptions',
        viewName: 'newsletter-subscriptions',
      });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getAdminNewsletterSubscriptions');
      next(err);
    }
  },

  async getBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getAdminBookings');
      renderAdminPage(res, {
        activePage: 'bookings',
        pageTitle: 'Bookings',
        scriptName: 'bookings',
        viewName: 'bookings',
      });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getAdminBookings');
      next(err);
    }
  },

  async getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getAdminPayments');
      renderAdminPage(res, {
        activePage: 'payments',
        pageTitle: 'Payments',
        scriptName: 'payments',
        viewName: 'payments',
      });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getAdminPayments');
      next(err);
    }
  },
};

export default adminViewController;
