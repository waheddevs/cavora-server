import { describe, expect, it } from 'vitest';
import {
  bookingHistoryQuerySchema,
  loginBodySchema,
  profileUpdateBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
  wishlistTourParamsSchema,
} from './member.validator';

describe('member validators', () => {
  it('normalizes a valid frontend registration payload', () => {
    const result = registerBodySchema.parse({
      email: '  Explorer@Example.com ',
      username: 'explorer_1',
      password: 'password123',
      firstName: ' Ada ',
      lastName: ' Lovelace ',
    });

    expect(result).toEqual({
      email: 'explorer@example.com',
      username: 'explorer_1',
      password: 'password123',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
  });

  it('rejects malformed, unknown, and boundary-breaking registration values', () => {
    expect(
      registerBodySchema.safeParse({
        email: 'not-an-email',
        username: 'bad name',
        password: 'short',
        firstName: '',
        lastName: 'Traveler',
        role: 'ADMIN',
      }).success,
    ).toBe(false);
  });

  it('rejects unknown login values and oversized passwords', () => {
    expect(
      loginBodySchema.safeParse({
        email: 'member@example.com',
        password: 'x'.repeat(129),
        rememberMe: true,
      }).success,
    ).toBe(false);
  });

  it('requires at least one valid profile field', () => {
    expect(profileUpdateBodySchema.safeParse({}).success).toBe(false);
    expect(profileUpdateBodySchema.safeParse({ phone: '' }).success).toBe(true);
    expect(profileUpdateBodySchema.safeParse({ role: 'ADMIN' }).success).toBe(false);
  });

  it('validates account tokens, booking pagination, and wishlist tour IDs', () => {
    expect(
      resetPasswordBodySchema.safeParse({ token: 'short', password: 'password123' }).success,
    ).toBe(false);
    expect(bookingHistoryQuerySchema.parse({})).toEqual({ page: 1, limit: 10 });
    expect(bookingHistoryQuerySchema.safeParse({ page: 0, limit: 51 }).success).toBe(false);
    expect(wishlistTourParamsSchema.parse({ tourId: '28' })).toEqual({ tourId: 28 });
    expect(wishlistTourParamsSchema.safeParse({ tourId: '0' }).success).toBe(false);
  });
});
