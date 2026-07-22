import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { ErrorCode, HttpCode } from '../errors/error-codes';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(
    new AppError(
      HttpCode.NOT_FOUND,
      ErrorCode.NOT_FOUND,
      `The requested route ${req.method} ${req.originalUrl} was not found.`,
    ),
  );
}
