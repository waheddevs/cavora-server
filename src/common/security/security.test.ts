import { describe, expect, it } from 'vitest';
import { argonPasswordAdapter } from './passwords';
import { createOpaqueToken, hashOpaqueToken, matchesTokenHash } from './tokens';

describe('account security helpers', () => {
  it('hashes and verifies passwords with Argon2id', async () => {
    const hash = await argonPasswordAdapter.hash('correct horse battery staple');

    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(argonPasswordAdapter.verify(hash, 'correct horse battery staple')).resolves.toBe(
      true,
    );
    await expect(argonPasswordAdapter.verify(hash, 'wrong password')).resolves.toBe(false);
  });

  it('creates random opaque tokens and purpose-bound token hashes', () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();
    const sessionHash = hashOpaqueToken(first, 'session');

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(sessionHash).not.toBe(first);
    expect(hashOpaqueToken(first, 'csrf')).not.toBe(sessionHash);
    expect(matchesTokenHash(first, sessionHash, 'session')).toBe(true);
    expect(matchesTokenHash(second, sessionHash, 'session')).toBe(false);
  });
});
