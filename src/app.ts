import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import pinoHttp from 'pino-http';
import { preventMutationCaching } from './common/middleware/cache-control';
import { errorHandler } from './common/middleware/error-handler';
import { notFound } from './common/middleware/not-found';
import { globalRateLimiter } from './common/middleware/rate-limit';
import { requestId } from './common/middleware/request-id';
import { env } from './config/env';
import { logger } from './config/logger';
import router from './router';
import adminViewRouter from './router.admin-view';
import adminRouter from './router.admin';

const app = express();
const projectRoot = path.resolve(__dirname, '..');

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function requestOrigin(headers: Record<string, string | string[] | undefined>): string | undefined {
  const forwardedHost = env.TRUST_PROXY > 0 ? firstHeader(headers['x-forwarded-host']) : undefined;
  const host = forwardedHost ?? firstHeader(headers.host);
  if (!host) return undefined;

  const forwardedProtocol =
    env.TRUST_PROXY > 0
      ? firstHeader(headers['x-forwarded-proto'])?.split(',')[0]?.trim()
      : undefined;
  const protocol = forwardedProtocol ?? (env.NODE_ENV === 'production' ? 'https' : 'http');
  return `${protocol}://${host}`;
}

app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY);
app.set('view engine', 'ejs');
app.set('views', path.join(projectRoot, 'src', 'views'));

app.use(requestId);
app.use(
  pinoHttp({
    genReqId: (req) => req.requestId,
    logger,
    serializers: {
      req(req) {
        const url =
          typeof req.url === 'string'
            ? req.url.replace(
                /^(\/cavora\/newsletter-subscriptions\/)[A-Za-z0-9_-]+/,
                '$1[REDACTED]',
              )
            : req.url;
        return { ...req, url };
      },
    },
  }),
);
app.use(helmet());
app.use(
  cors((req, callback) => {
    const origin = firstHeader(req.headers.origin);
    const sameOrigin = origin !== undefined && origin === requestOrigin(req.headers);

    if (!origin || origin === env.FRONTEND_ORIGIN || sameOrigin) {
      const options: CorsOptions = {
        credentials: true,
        origin: origin !== undefined,
      };
      callback(null, options);
      return;
    }

    callback(new Error('CORS_ORIGIN_DENIED'));
  }),
);
app.use(cookieParser());
app.use(
  '/cavora/payments/webhooks/stripe',
  express.raw({ type: 'application/json', limit: '1mb' }),
);
app.use(express.json({ limit: '1mb' }));
app.use(preventMutationCaching);
app.use(globalRateLimiter);
app.use(
  '/assets',
  express.static(path.join(projectRoot, 'public'), {
    etag: true,
    index: false,
    maxAge: env.NODE_ENV === 'production' ? '1d' : 0,
  }),
);

app.use('/admin', adminViewRouter);
app.use('/cavora/admin', adminRouter);
app.use('/cavora', router);

app.use(notFound);
app.use(errorHandler);

export default app;
