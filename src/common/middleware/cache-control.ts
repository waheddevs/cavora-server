import type { NextFunction, Request, Response } from 'express';

const cacheableMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export function preventMutationCaching(req: Request, res: Response, next: NextFunction): void {
  if (!cacheableMethods.has(req.method)) {
    res.setHeader('Cache-Control', 'private, no-store');
  }
  next();
}
