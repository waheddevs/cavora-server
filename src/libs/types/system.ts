export type DatabaseStatus = 'connected' | 'connecting' | 'disconnecting' | 'disconnected';

export interface HealthResult {
  checks: {
    application: 'up';
    database: DatabaseStatus;
  };
  environment: string;
  service: 'cavora-server';
  status: 'ok' | 'degraded';
  timestamp: string;
}
