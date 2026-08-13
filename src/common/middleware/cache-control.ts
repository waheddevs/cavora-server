import type { NextFunction, Request, Response } from 'express';

const cacheableMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Cache header for public reads the admin panel can edit.
 *
 * These were served with `max-age` and `stale-while-revalidate`, which left an
 * edit invisible on the storefront for minutes: a tour took five before the
 * browser would even ask again, and up to ten more serving the stale copy. The
 * response is still cacheable here — `no-cache` only forces revalidation, and
 * Express answers an unchanged read with a 304 off its ETag, so the saving
 * survives while an edit lands on the next request.
 */
export const EDITABLE_CONTENT_CACHE = 'public, no-cache';

export function preventMutationCaching(req: Request, res: Response, next: NextFunction): void {
  if (!cacheableMethods.has(req.method)) {
    res.setHeader('Cache-Control', 'private, no-store');
  }
  next();
}
