import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { ErrorCode, HttpCode } from '../../src/common/errors/error-codes';
import { env } from '../../src/config/env';

describe('system API', () => {
  it('reports degraded health when the test app has no database connection', async () => {
    const response = await request(app).get('/cavora/health');

    expect(response.status).toBe(HttpCode.SERVICE_UNAVAILABLE);
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/i);
    expect(response.body).toMatchObject({
      data: {
        status: 'degraded',
        service: 'cavora-server',
        environment: 'test',
        checks: {
          application: 'up',
          database: 'disconnected',
        },
      },
    });
    expect(Date.parse(response.body.data.timestamp as string)).not.toBeNaN();
  });

  it('preserves a safe caller-provided request ID', async () => {
    const response = await request(app)
      .get('/cavora/health')
      .set('x-request-id', 'frontend-request-123');

    expect(response.status).toBe(HttpCode.SERVICE_UNAVAILABLE);
    expect(response.headers['x-request-id']).toBe('frontend-request-123');
  });

  it('returns the common error shape for an unknown API route', async () => {
    const response = await request(app).get('/cavora/does-not-exist');

    expect(response.status).toBe(HttpCode.NOT_FOUND);
    expect(response.body).toEqual({
      status: HttpCode.NOT_FOUND,
      code: ErrorCode.NOT_FOUND,
      message: 'The requested route GET /cavora/does-not-exist was not found.',
      requestId: response.headers['x-request-id'],
    });
  });

  it('returns JSON rather than an Express HTML 404 outside the API prefix', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(HttpCode.NOT_FOUND);
    expect(response.type).toBe('application/json');
    expect(response.body.code).toBe(ErrorCode.NOT_FOUND);
  });

  it('returns a safe 400 response for malformed JSON', async () => {
    const response = await request(app)
      .post('/cavora/does-not-exist')
      .set('content-type', 'application/json')
      .send('{"broken":');

    expect(response.status).toBe(HttpCode.BAD_REQUEST);
    expect(response.body).toMatchObject({
      status: HttpCode.BAD_REQUEST,
      code: ErrorCode.BAD_JSON,
      message: 'The request body contains malformed JSON.',
    });
  });

  it('allows the configured frontend origin with credentials', async () => {
    const response = await request(app).get('/cavora/health').set('origin', env.FRONTEND_ORIGIN);

    expect(response.status).toBe(HttpCode.SERVICE_UNAVAILABLE);
    expect(response.headers['access-control-allow-origin']).toBe(env.FRONTEND_ORIGIN);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rejects an unapproved browser origin with the common error shape', async () => {
    const response = await request(app)
      .get('/cavora/health')
      .set('origin', 'https://untrusted.example');

    expect(response.status).toBe(HttpCode.FORBIDDEN);
    expect(response.body).toMatchObject({
      status: HttpCode.FORBIDDEN,
      code: ErrorCode.CORS_ORIGIN_DENIED,
      message: 'The request origin is not allowed.',
    });
  });
});
