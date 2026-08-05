import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env';

type TokenPurpose = 'csrf' | 'email-verification' | 'password-reset' | 'session';

export function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashOpaqueToken(token: string, purpose: TokenPurpose): string {
  const secret = purpose === 'csrf' ? env.CSRF_SECRET : env.SESSION_TOKEN_PEPPER;
  return createHmac('sha256', secret).update(`${purpose}:${token}`).digest('hex');
}

export function matchesTokenHash(
  token: string,
  expectedHash: string,
  purpose: TokenPurpose,
): boolean {
  const actualHash = hashOpaqueToken(token, purpose);
  const actual = Buffer.from(actualHash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
