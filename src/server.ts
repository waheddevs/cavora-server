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
    logger.info(
      {
        environment: env.NODE_ENV,
        host: env.SERVER_HOST,
        port: env.PORT,
      },
      'Cavora server listening',
    );
  });

  server.on('error', (err) => {
    logger.fatal({ err }, 'Cavora server failed');
    process.exitCode = 1;
  });
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, 'Shutting down Cavora server');

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  await mongoose.disconnect();
}

function handleShutdown(signal: NodeJS.Signals): void {
  void shutdown(signal).catch((err: unknown) => {
    logger.error({ err }, 'Failed to shut down cleanly');
    process.exitCode = 1;
  });
}

process.once('SIGINT', handleShutdown);
process.once('SIGTERM', handleShutdown);

void startServer().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to start Cavora server');
  process.exitCode = 1;
});
