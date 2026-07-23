import rateLimit from 'express-rate-limit';
import { ErrorCode, HttpCode } from '../errors/error-codes';

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

function createRateLimiter(options: RateLimitOptions) {
  return rateLimit({
    legacyHeaders: false,
    limit: options.limit,
    standardHeaders: 'draft-8',
    windowMs: options.windowMs,
    handler(req, res) {
      res.status(HttpCode.TOO_MANY_REQUESTS).json({
        status: HttpCode.TOO_MANY_REQUESTS,
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests. Please try again later.',
        requestId: req.requestId,
      });
    },
  });
}

export const globalRateLimiter = createRateLimiter({
  limit: 1_000,
  windowMs: 15 * 60 * 1_000,
});

export const registrationRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60 * 60 * 1_000,
});

export const loginRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 15 * 60 * 1_000,
});

export const accountRecoveryRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1_000,
});

export const commentRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60 * 60 * 1_000,
});

export const contactRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60 * 60 * 1_000,
});

export const newsletterRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60 * 60 * 1_000,
});
