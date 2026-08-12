import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env';
import type { SessionTokens } from '../../libs/types/member';
import { requestCookieNames } from './surface';

function baseCookieOptions(): CookieOptions {
  return {
    path: '/',
    sameSite: env.COOKIE_SAME_SITE,
    secure: env.NODE_ENV === 'production' || env.COOKIE_SAME_SITE === 'none',
  };
}

/* Cookies are written for the surface the request came from, so an admin
   signing in never disturbs the storefront session in the same browser. */
export function setAuthenticationCookies(req: Request, res: Response, tokens: SessionTokens): void {
  const maxAge = Math.max(0, tokens.expiresAt.getTime() - Date.now());
  const names = requestCookieNames(req);

  // Older builds scoped these to /cavora; clear that path too so a stale
  // cookie cannot shadow the one written below.
  res.clearCookie(names.session, { ...baseCookieOptions(), httpOnly: true, path: '/cavora' });
  res.clearCookie(names.csrf, { ...baseCookieOptions(), httpOnly: false, path: '/cavora' });
  res.cookie(names.session, tokens.sessionToken, {
    ...baseCookieOptions(),
    httpOnly: true,
    maxAge,
  });
  res.cookie(names.csrf, tokens.csrfToken, {
    ...baseCookieOptions(),
    httpOnly: false,
    maxAge,
  });
}

export function clearAuthenticationCookies(req: Request, res: Response): void {
  const names = requestCookieNames(req);

  res.clearCookie(names.session, { ...baseCookieOptions(), httpOnly: true });
  res.clearCookie(names.csrf, { ...baseCookieOptions(), httpOnly: false });
  res.clearCookie(names.session, { ...baseCookieOptions(), httpOnly: true, path: '/cavora' });
  res.clearCookie(names.csrf, { ...baseCookieOptions(), httpOnly: false, path: '/cavora' });
}
