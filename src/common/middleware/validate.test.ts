import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { validate } from './validate';

function createRequest(body: unknown): Request {
  return {
    body,
    params: {},
    query: {},
  } as Request;
}

describe('validate middleware', () => {
  const bodySchema = z
    .object({
      travelers: z.coerce.number().int().min(1).max(20),
    })
    .strict();

  it('stores parsed input on the request', async () => {
    const req = createRequest({ travelers: '2' });
    const next = vi.fn();

    await validate({ body: bodySchema })(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
    expect(req.validated.body).toEqual({ travelers: 2 });
  });

  it('forwards structured validation errors', async () => {
    const req = createRequest({ travelers: 0, unexpected: true });
    const next = vi.fn();

    await validate({ body: bodySchema })(req, {} as Response, next as NextFunction);

    const error = next.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
      fieldErrors: {
        'body.travelers': 'Too small: expected number to be >=1',
        'body.request': 'Unrecognized key: "unexpected"',
      },
    });
  });
});
