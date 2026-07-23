import { describe, expect, it } from 'vitest';
import SystemService from './System.service';

describe('SystemService', () => {
  it('reports healthy when Mongoose is connected', () => {
    const service = new SystemService(() => 1);

    expect(service.getHealth()).toMatchObject({
      status: 'ok',
      checks: {
        application: 'up',
        database: 'connected',
      },
    });
  });

  it('reports degraded for an unavailable database state', () => {
    const service = new SystemService(() => 0);

    expect(service.getHealth()).toMatchObject({
      status: 'degraded',
      checks: {
        application: 'up',
        database: 'disconnected',
      },
    });
  });

  it('provides the OpenAPI contract for the Cavora API', () => {
    const service = new SystemService(() => 1);
    const document = service.getOpenApiDocument();

    expect(document.openapi).toBe('3.1.0');
    expect(document.servers).toContainEqual({
      url: '/cavora',
      description: 'Cavora API',
    });
    expect(document.paths['/health']).toHaveProperty('get');
    expect(document.paths['/openapi.json']).toHaveProperty('get');
  });
});
