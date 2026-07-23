import type { CookieOptions, Response } from 'express';
import { env } from '../../config/env';
import type { SessionTokens } from '../../libs/types/member';

function baseCookieOptions(): CookieOptions {
  return {
    path: '/cavora',
    sameSite: env.COOKIE_SAME_SITE,
    secure: env.NODE_ENV === 'production' || env.COOKIE_SAME_SITE === 'none',
  };
}

export function setAuthenticationCookies(res: Response, tokens: SessionTokens): void {
  const maxAge = Math.max(0, tokens.expiresAt.getTime() - Date.now());

  res.cookie(env.SESSION_COOKIE_NAME, tokens.sessionToken, {
    ...baseCookieOptions(),
    httpOnly: true,
    maxAge,
  });
  res.cookie(env.CSRF_COOKIE_NAME, tokens.csrfToken, {
    ...baseCookieOptions(),
    httpOnly: false,
    maxAge,
  });
}

export function clearAuthenticationCookies(res: Response): void {
  res.clearCookie(env.SESSION_COOKIE_NAME, { ...baseCookieOptions(), httpOnly: true });
  res.clearCookie(env.CSRF_COOKIE_NAME, { ...baseCookieOptions(), httpOnly: false });
}
