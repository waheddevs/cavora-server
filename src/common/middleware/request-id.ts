import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const validRequestId = /^[A-Za-z0-9._:-]{1,128}$/;

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const candidate = req.header('x-request-id');
  req.requestId = candidate && validRequestId.test(candidate) ? candidate : randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
}
