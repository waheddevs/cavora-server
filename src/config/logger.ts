import pino from 'pino';
import { env } from './env';

export const logger = pino({
  base: {
    environment: env.NODE_ENV,
    service: 'cavora-server',
  },
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      '*.password',
      '*.passwordHash',
      '*.sessionToken',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
});
