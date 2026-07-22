import rateLimit from 'express-rate-limit';
import { ErrorCode, HttpCode } from '../errors/error-codes';

export const globalRateLimiter = rateLimit({
  legacyHeaders: false,
  limit: 1_000,
  standardHeaders: 'draft-8',
  windowMs: 15 * 60 * 1_000,
  handler(req, res) {
    res.status(HttpCode.TOO_MANY_REQUESTS).json({
      status: HttpCode.TOO_MANY_REQUESTS,
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests. Please try again later.',
      requestId: req.requestId,
    });
  },
});
