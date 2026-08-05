import { AppError } from './app-error';
import { ErrorCode, HttpCode } from './error-codes';

function isBodyParserSyntaxError(error: unknown): error is SyntaxError & { body: unknown } {
  return error instanceof SyntaxError && 'body' in error;
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (isBodyParserSyntaxError(error)) {
    return new AppError(
      HttpCode.BAD_REQUEST,
      ErrorCode.BAD_JSON,
      'The request body contains malformed JSON.',
      { cause: error },
    );
  }

  if (error instanceof Error && error.message === 'CORS_ORIGIN_DENIED') {
    return new AppError(
      HttpCode.FORBIDDEN,
      ErrorCode.CORS_ORIGIN_DENIED,
      'The request origin is not allowed.',
      { cause: error },
    );
  }

  return AppError.internal(error);
}
