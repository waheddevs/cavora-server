import type { NextFunction, Request, Response } from 'express';
import { HttpCode } from '../common/errors/error-codes';
import { clearAuthenticationCookies, setAuthenticationCookies } from '../common/security/cookies';
import type { BookingInquiry } from '../libs/types/booking';
import type {
  AuthContext,
  ForgotPasswordInput,
  LoginInput,
  ProfileUpdateInput,
  RegisterInput,
  RequestContext,
  ResetPasswordInput,
  VerifyEmailInput,
} from '../libs/types/member';
import MemberService from '../models/Member.service';

const memberService = new MemberService();

function requestContext(req: Request): RequestContext {
  const userAgent = req.get('user-agent');
  return {
    requestId: req.requestId,
    ipAddress: req.ip,
    ...(userAgent ? { userAgent: userAgent.slice(0, 1_024) } : {}),
  };
}

function authenticated(req: Request): AuthContext {
  return req.auth as AuthContext;
}

function preventPrivateCaching(res: Response): void {
  res.setHeader('Cache-Control', 'private, no-store');
}

const memberController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('register');
      const result = await memberService.register(
        req.validated.body as RegisterInput,
        requestContext(req),
      );
      setAuthenticationCookies(res, result.tokens);
      preventPrivateCaching(res);
      res.status(HttpCode.CREATED).json({ data: result.member });
    } catch (err) {
      req.log.error({ err }, 'ERROR on register');
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('login');
      const result = await memberService.login(
        req.validated.body as LoginInput,
        requestContext(req),
      );
      setAuthenticationCookies(res, result.tokens);
      preventPrivateCaching(res);
      res.status(HttpCode.OK).json({ data: result.member });
    } catch (err) {
      req.log.error({ err }, 'ERROR on login');
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('logout');
      await memberService.logout(authenticated(req), requestContext(req));
      clearAuthenticationCookies(res);
      preventPrivateCaching(res);
      res.status(HttpCode.NO_CONTENT).send();
    } catch (err) {
      req.log.error({ err }, 'ERROR on logout');
      next(err);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('forgotPassword');
      const result = await memberService.forgotPassword(
        req.validated.body as ForgotPasswordInput,
        requestContext(req),
      );
      preventPrivateCaching(res);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on forgotPassword');
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('resetPassword');
      const result = await memberService.resetPassword(
        req.validated.body as ResetPasswordInput,
        requestContext(req),
      );
      clearAuthenticationCookies(res);
      preventPrivateCaching(res);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on resetPassword');
      next(err);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('verifyEmail');
      const result = await memberService.verifyEmail(
        req.validated.body as VerifyEmailInput,
        requestContext(req),
      );
      preventPrivateCaching(res);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on verifyEmail');
      next(err);
    }
  },

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getProfile');
      const result = await memberService.getProfile(authenticated(req).memberId);
      preventPrivateCaching(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on getProfile');
      next(err);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('updateProfile');
      const result = await memberService.updateProfile(
        authenticated(req),
        req.validated.body as ProfileUpdateInput,
        requestContext(req),
      );
      preventPrivateCaching(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on updateProfile');
      next(err);
    }
  },

  async getBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getBookings');
      const result = await memberService.getBookings(
        authenticated(req).memberId,
        req.validated.query as BookingInquiry,
      );
      preventPrivateCaching(res);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on getBookings');
      next(err);
    }
  },

  async getWishlist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('getWishlist');
      const result = await memberService.getWishlist(authenticated(req).memberId);
      preventPrivateCaching(res);
      res.status(HttpCode.OK).json(result);
    } catch (err) {
      req.log.error({ err }, 'ERROR on getWishlist');
      next(err);
    }
  },

  async addWishlistTour(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('addWishlistTour');
      const { tourId } = req.validated.params as { tourId: number };
      const result = await memberService.addWishlistTour(
        authenticated(req).memberId,
        tourId,
        requestContext(req),
      );
      preventPrivateCaching(res);
      res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
      req.log.error({ err }, 'ERROR on addWishlistTour');
      next(err);
    }
  },

  async removeWishlistTour(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      req.log.info('removeWishlistTour');
      const { tourId } = req.validated.params as { tourId: number };
      await memberService.removeWishlistTour(
        authenticated(req).memberId,
        tourId,
        requestContext(req),
      );
      preventPrivateCaching(res);
      res.status(HttpCode.NO_CONTENT).send();
    } catch (err) {
      req.log.error({ err }, 'ERROR on removeWishlistTour');
      next(err);
    }
  },
};

export default memberController;
