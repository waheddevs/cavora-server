import pino from 'pino';
import { env } from './env';

export const logger = pino({
  base: {
    environment: env.NODE_ENV,
    service: 'cavora-server',
  },
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        }
      : undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers.idempotency-key',
      'req.headers.stripe-signature',
      'req.headers.x-csrf-token',
      'password',
      '*.password',
      '*.sessionToken',
      '*.csrfToken',
      '*.csrfTokenHash',
      '*.token',
      '*.tokenHash',
    ],
    censor: '[REDACTED]',
  },
});
