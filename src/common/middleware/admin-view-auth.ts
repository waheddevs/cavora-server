import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';

export function redirectAdminLogin(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof AppError && err.code === ErrorCode.AUTHENTICATION_REQUIRED) {
    res.set('Cache-Control', 'private, no-store');
    res.redirect('/admin/login');
    return;
  }

  next(err);
}
