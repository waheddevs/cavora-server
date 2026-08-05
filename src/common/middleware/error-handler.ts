import type { ErrorRequestHandler } from 'express';
import type { ErrorCode } from '../errors/error-codes';
import { normalizeError } from '../errors/normalize-error';

interface ErrorResponse {
  code: ErrorCode;
  fieldErrors?: Record<string, string>;
  message: string;
  requestId: string;
  status: number;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const appError = normalizeError(err);

  const log = appError.status >= 500 ? req.log.error.bind(req.log) : req.log.warn.bind(req.log);
  log({ err, errorCode: appError.code }, 'Request failed');

  const response: ErrorResponse = {
    status: appError.status,
    code: appError.code,
    message: appError.message,
    requestId: req.requestId,
  };

  if (appError.fieldErrors) response.fieldErrors = appError.fieldErrors;

  res.setHeader('Cache-Control', 'private, no-store');
  res.status(appError.status).json(response);
};
