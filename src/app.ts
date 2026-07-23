import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { preventMutationCaching } from './common/middleware/cache-control';
import { errorHandler } from './common/middleware/error-handler';
import { notFound } from './common/middleware/not-found';
import { globalRateLimiter } from './common/middleware/rate-limit';
import { requestId } from './common/middleware/request-id';
import { env } from './config/env';
import { logger } from './config/logger';
import router from './router';
import adminRouter from './router.admin';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY);

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
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || origin === env.FRONTEND_ORIGIN) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS_ORIGIN_DENIED'));
    },
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

app.use('/cavora/admin', adminRouter);
app.use('/cavora', router);

app.use(notFound);
app.use(errorHandler);

export default app;
