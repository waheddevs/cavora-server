import mongoose from 'mongoose';
import { env } from '../config/env';
import { openApiDocument } from '../config/openapi';
import type { DatabaseStatus, HealthResult } from '../libs/types/system';

const databaseStatuses: Record<number, DatabaseStatus> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

class SystemService {
  public constructor(
    private readonly getReadyState: () => number = () => mongoose.connection.readyState,
  ) {}

  public getHealth(): HealthResult {
    const database = databaseStatuses[this.getReadyState()] ?? 'disconnected';

    return {
      status: database === 'connected' ? 'ok' : 'degraded',
      service: 'cavora-server',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      checks: {
        application: 'up',
        database,
      },
    };
  }

  public getOpenApiDocument(): typeof openApiDocument {
    return openApiDocument;
  }
}

export default SystemService;
