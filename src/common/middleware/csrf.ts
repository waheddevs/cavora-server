import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { ErrorCode, HttpCode } from '../errors/error-codes';
import { env } from '../../config/env';
import { matchesTokenHash } from '../security/tokens';

export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  try {
    const cookieValue: unknown = req.cookies[env.CSRF_COOKIE_NAME];
    const cookieToken = typeof cookieValue === 'string' ? cookieValue : undefined;
    const headerToken = req.get('x-csrf-token');
    const valid =
      req.auth !== undefined &&
      cookieToken !== undefined &&
      headerToken !== undefined &&
      cookieToken === headerToken &&
      matchesTokenHash(headerToken, req.auth.csrfTokenHash, 'csrf');

    if (!valid) {
      throw new AppError(
        HttpCode.FORBIDDEN,
        ErrorCode.CSRF_INVALID,
        'A valid CSRF token is required.',
      );
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireCsrfIfAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    next();
    return;
  }
  requireCsrf(req, res, next);
}
