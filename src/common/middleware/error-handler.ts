import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app-error';
import { ErrorCode, HttpCode } from '../errors/error-codes';

interface ErrorResponse {
  code: ErrorCode;
  fieldErrors?: Record<string, string>;
  message: string;
  requestId: string;
  status: number;
}

function isBodyParserSyntaxError(err: unknown): err is SyntaxError & { body: unknown } {
  return err instanceof SyntaxError && 'body' in err;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (isBodyParserSyntaxError(err)) {
    appError = new AppError(
      HttpCode.BAD_REQUEST,
      ErrorCode.BAD_JSON,
      'The request body contains malformed JSON.',
      { cause: err },
    );
  } else if (err instanceof Error && err.message === 'CORS_ORIGIN_DENIED') {
    appError = new AppError(
      HttpCode.FORBIDDEN,
      ErrorCode.CORS_ORIGIN_DENIED,
      'The request origin is not allowed.',
      { cause: err },
    );
  } else {
    appError = new AppError(
      HttpCode.INTERNAL_SERVER_ERROR,
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Something went wrong. Please try again later.',
      { cause: err },
    );
  }

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
