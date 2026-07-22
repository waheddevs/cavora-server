import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { errorHandler } from './common/middleware/error-handler';
import { notFound } from './common/middleware/not-found';
import { globalRateLimiter } from './common/middleware/rate-limit';
import { requestId } from './common/middleware/request-id';
import { env } from './config/env';
import { logger } from './config/logger';
import router from './router';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY);

app.use(requestId);
app.use(
  pinoHttp({
    genReqId: (req) => req.requestId,
    logger,
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
app.use(express.json({ limit: '1mb' }));
app.use(globalRateLimiter);

app.use('/cavora', router);

app.use(notFound);
app.use(errorHandler);

export default app;
