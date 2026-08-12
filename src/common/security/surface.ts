import type { Request } from 'express';
import { env } from '../../config/env';

/* The admin panel and the storefront share one origin, so they would otherwise
   share one session cookie: signing out of either signed out both, and logging
   into one replaced the other. Each surface gets its own cookie pair, and every
   request is attributed to a surface before any cookie is read or written. */
export type AuthSurface = 'admin' | 'member';

const SURFACE_HEADER = 'x-cavora-surface';

export interface SurfaceCookieNames {
  csrf: string;
  session: string;
}

export function authSurface(req: Request): AuthSurface {
  // Server-rendered admin pages are plain navigations and cannot set a header,
  // so they are recognised by the router they were mounted under.
  if (req.baseUrl === '/admin') return 'admin';

  // Everything the admin panel fetches marks itself, because /users/me and
  // /auth/* are the very same endpoints the storefront calls.
  return req.get(SURFACE_HEADER) === 'admin' ? 'admin' : 'member';
}

export function cookieNamesFor(surface: AuthSurface): SurfaceCookieNames {
  return surface === 'admin'
    ? { csrf: env.ADMIN_CSRF_COOKIE_NAME, session: env.ADMIN_SESSION_COOKIE_NAME }
    : { csrf: env.CSRF_COOKIE_NAME, session: env.SESSION_COOKIE_NAME };
}

export function requestCookieNames(req: Request): SurfaceCookieNames {
  return cookieNamesFor(authSurface(req));
}
