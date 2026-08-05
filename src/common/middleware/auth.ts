import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env';
import { AppError } from '../errors/app-error';
import { ErrorCode, HttpCode } from '../errors/error-codes';
import { clearAuthenticationCookies } from '../security/cookies';
import { MemberRole } from '../../libs/enums/member.enum';
import MemberService from '../../models/Member.service';

const memberService = new MemberService();

function isAuthenticationRequired(error: unknown): error is AppError {
  return error instanceof AppError && error.code === ErrorCode.AUTHENTICATION_REQUIRED;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cookieValue: unknown = req.cookies[env.SESSION_COOKIE_NAME];
    const sessionToken = typeof cookieValue === 'string' ? cookieValue : undefined;
    req.auth = await memberService.authenticateSession(sessionToken);
    next();
  } catch (err) {
    if (isAuthenticationRequired(err)) clearAuthenticationCookies(res);
    next(err);
  }
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const cookieValue: unknown = req.cookies[env.SESSION_COOKIE_NAME];
    if (typeof cookieValue === 'string') {
      req.auth = await memberService.authenticateSession(cookieValue);
    }
    next();
  } catch (err) {
    if (isAuthenticationRequired(err)) {
      clearAuthenticationCookies(res);
      next();
      return;
    }
    next(err);
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (req.auth?.role !== MemberRole.ADMIN) {
      throw new AppError(
        HttpCode.FORBIDDEN,
        ErrorCode.AUTHORIZATION_REQUIRED,
        'Administrator access is required.',
      );
    }
    next();
  } catch (err) {
    next(err);
  }
}
