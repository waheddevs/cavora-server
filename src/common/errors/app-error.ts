import { ErrorCode, HttpCode } from './error-codes';

export type FieldErrors = Record<string, string>;

interface AppErrorOptions {
  cause?: unknown;
  fieldErrors?: FieldErrors;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly fieldErrors?: FieldErrors;
  public readonly status: HttpCode;

  public constructor(
    status: HttpCode,
    code: ErrorCode,
    message: string,
    options: AppErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.fieldErrors = options.fieldErrors;
  }

  public static validation(fieldErrors: FieldErrors): AppError {
    return new AppError(
      HttpCode.UNPROCESSABLE_ENTITY,
      ErrorCode.VALIDATION_ERROR,
      'The request contains invalid fields.',
      { fieldErrors },
    );
  }
}
