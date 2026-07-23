import type { Server } from 'node:http';
import mongoose from 'mongoose';
import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import BookingService from './models/Booking.service';

let server: Server | undefined;
let bookingHoldSweep: NodeJS.Timeout | undefined;
const bookingService = new BookingService();

async function startServer(): Promise<void> {
  await mongoose.connect(env.MONGO_URL);
  logger.info('MongoDB connected');

  server = app.listen(env.PORT, env.SERVER_HOST, () => {
    logger.info({ port: env.PORT }, 'Cavora server listening');
  });
  bookingHoldSweep = setInterval(() => {
    void bookingService.releaseExpiredHolds().catch((err: unknown) => {
      logger.error({ err }, 'Failed to release expired booking holds');
    });
  }, 60_000);
  bookingHoldSweep.unref();

  server.on('error', (err) => {
    logger.fatal({ err }, 'Cavora server failed');
    process.exitCode = 1;
  });
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, 'Shutting down Cavora server');
  if (bookingHoldSweep) clearInterval(bookingHoldSweep);

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
