import type { Server } from 'node:http';
import mongoose from 'mongoose';
import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';

let server: Server | undefined;

async function startServer(): Promise<void> {
  await mongoose.connect(env.MONGO_URL);
  logger.info('MongoDB connected');

  server = app.listen(env.PORT, env.SERVER_HOST, () => {
    logger.info({ port: env.PORT }, 'Cavora server listening');
  });

  server.on('error', (err) => {
    logger.fatal({ err }, 'Cavora server failed');
    process.exitCode = 1;
  });
}

void startServer().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to start Cavora server');
  process.exitCode = 1;
});
