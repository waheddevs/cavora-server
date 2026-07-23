import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env';
import { AppError } from '../errors/app-error';
import { ErrorCode, HttpCode } from '../errors/error-codes';
import { MemberRole } from '../../libs/enums/member.enum';
import MemberService from '../../models/Member.service';

const memberService = new MemberService();

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const cookieValue: unknown = req.cookies[env.SESSION_COOKIE_NAME];
    const sessionToken = typeof cookieValue === 'string' ? cookieValue : undefined;
    req.auth = await memberService.authenticateSession(sessionToken);
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const cookieValue: unknown = req.cookies[env.SESSION_COOKIE_NAME];
    if (typeof cookieValue === 'string') {
      req.auth = await memberService.authenticateSession(cookieValue);
    }
    next();
  } catch (err) {
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
