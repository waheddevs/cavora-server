import { Types } from 'mongoose';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/app';
import { accountEmailAdapter } from '../../src/common/email/account-email.adapter';
import { ErrorCode, HttpCode } from '../../src/common/errors/error-codes';
import { hashOpaqueToken } from '../../src/common/security/tokens';
import { MemberRole, MemberStatus } from '../../src/libs/enums/member.enum';
import AuditLog from '../../src/schema/AuditLog.model';
import Booking from '../../src/schema/Booking.model';
import EmailVerificationToken from '../../src/schema/EmailVerificationToken.model';
import Member from '../../src/schema/Member.model';
import PasswordResetToken from '../../src/schema/PasswordResetToken.model';
import Session from '../../src/schema/Session.model';
import Tour from '../../src/schema/Tour.model';
import Wishlist from '../../src/schema/Wishlist.model';

function queryResult<T>(value: T) {
  const query = {
    collation: vi.fn(),
    select: vi.fn(),
    lean: vi.fn(),
    exec: vi.fn().mockResolvedValue(value),
  };
  query.collation.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.lean.mockReturnValue(query);
  return query;
}

function mutationResult(value: unknown = {}) {
  return { exec: vi.fn().mockResolvedValue(value) };
}

function setCookieHeaders(response: request.Response): string[] {
  const value: unknown = response.headers['set-cookie'];
  if (Array.isArray(value)) return value as string[];
  return typeof value === 'string' ? [value] : [];
}

const memberId = new Types.ObjectId();
const sessionId = new Types.ObjectId();
const createdAt = new Date('2026-07-23T00:00:00.000Z');
const memberRecord = {
  _id: memberId,
  email: 'explorer@example.com',
  username: 'explorer_1',
  passwordHash: 'not-returned',
  firstName: 'Ada',
  lastName: 'Lovelace',
  role: MemberRole.USER,
  status: MemberStatus.ACTIVE,
  createdAt,
  updatedAt: createdAt,
};

function mockAuthentication(csrfToken = 'csrf-token-for-test'): void {
  vi.spyOn(Session, 'findOne').mockImplementation(
    () =>
      queryResult({
        _id: sessionId,
        memberId,
        csrfTokenHash: hashOpaqueToken(csrfToken, 'csrf'),
        expiresAt: new Date(Date.now() + 60_000),
        lastUsedAt: new Date(),
      }) as never,
  );
  vi.spyOn(Member, 'findById').mockImplementation(() => queryResult(memberRecord) as never);
}

describe('member authentication and account API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    accountEmailAdapter.clear();
  });

  it('registers a member, sets secure-purpose cookies, and never returns secrets', async () => {
    vi.spyOn(Member, 'findOne').mockReturnValue(queryResult(null) as never);
    vi.spyOn(Member, 'create').mockResolvedValue({
      ...memberRecord,
      toObject: () => memberRecord,
    } as never);
    vi.spyOn(EmailVerificationToken, 'updateMany').mockReturnValue(mutationResult() as never);
    vi.spyOn(EmailVerificationToken, 'create').mockResolvedValue({} as never);
    const createSession = vi.spyOn(Session, 'create').mockResolvedValue({} as never);
    vi.spyOn(AuditLog, 'create').mockResolvedValue({} as never);

    const response = await request(app).post('/cavora/auth/register').send({
      email: 'Explorer@Example.com',
      username: 'explorer_1',
      password: 'password123',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    expect(response.status).toBe(HttpCode.CREATED);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body.data).toMatchObject({
      id: memberId.toString(),
      email: 'explorer@example.com',
      username: 'explorer_1',
      emailVerified: false,
    });
    expect(JSON.stringify(response.body)).not.toMatch(/password|tokenHash|csrfToken|sessionToken/i);

    const cookies = setCookieHeaders(response);
    const sessionCookie = cookies.find((cookie) => cookie.startsWith('cavora_session='));
    const csrfCookie = cookies.find((cookie) => cookie.startsWith('cavora_csrf='));
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('SameSite=Lax');
    expect(csrfCookie).not.toContain('HttpOnly');
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId,
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        csrfTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(accountEmailAdapter.verifications).toHaveLength(1);
  });

  it('returns a field-specific conflict without hashing or creating a duplicate member', async () => {
    vi.spyOn(Member, 'findOne').mockReturnValue(queryResult(memberRecord) as never);
    const createMember = vi.spyOn(Member, 'create');

    const response = await request(app).post('/cavora/auth/register').send({
      email: 'explorer@example.com',
      username: 'another_name',
      password: 'password123',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    expect(response.status).toBe(HttpCode.CONFLICT);
    expect(response.body).toMatchObject({
      code: ErrorCode.EMAIL_ALREADY_REGISTERED,
      fieldErrors: { 'body.email': 'Email is already registered.' },
    });
    expect(createMember).not.toHaveBeenCalled();
  });

  it('does not reveal whether an invalid login email exists', async () => {
    vi.spyOn(Member, 'findOne').mockReturnValue(queryResult(null) as never);

    const response = await request(app).post('/cavora/auth/login').send({
      email: 'missing@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(HttpCode.UNAUTHORIZED);
    expect(response.body).toMatchObject({
      code: ErrorCode.INVALID_CREDENTIALS,
      message: 'Email or password is incorrect.',
    });
  });

  it('rejects unauthenticated profile access', async () => {
    const response = await request(app).get('/cavora/users/me');

    expect(response.status).toBe(HttpCode.UNAUTHORIZED);
    expect(response.body.code).toBe(ErrorCode.AUTHENTICATION_REQUIRED);
  });

  it('returns the authenticated profile without public caching', async () => {
    const sessionToken = 'session-token-for-profile';
    vi.spyOn(Session, 'findOne').mockReturnValue(
      queryResult({
        _id: sessionId,
        memberId,
        csrfTokenHash: hashOpaqueToken('csrf-token', 'csrf'),
        expiresAt: new Date(Date.now() + 60_000),
        lastUsedAt: new Date(),
      }) as never,
    );
    vi.spyOn(Member, 'findById')
      .mockReturnValueOnce(queryResult(memberRecord) as never)
      .mockReturnValueOnce(queryResult(memberRecord) as never);
    vi.spyOn(Booking, 'countDocuments').mockReturnValue(mutationResult(2) as never);
    vi.spyOn(Wishlist, 'countDocuments').mockReturnValue(mutationResult(3) as never);

    const response = await request(app)
      .get('/cavora/users/me')
      .set('Cookie', `cavora_session=${sessionToken}`);

    expect(response.status).toBe(HttpCode.OK);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body.data).toMatchObject({
      id: memberId.toString(),
      stats: { bookings: 2, wishlist: 3 },
    });
  });

  it('requires a matching CSRF cookie and header before logout', async () => {
    const sessionToken = 'session-token-for-logout';
    const csrfToken = 'csrf-token-for-logout';
    vi.spyOn(Session, 'findOne').mockImplementation(
      () =>
        queryResult({
          _id: sessionId,
          memberId,
          csrfTokenHash: hashOpaqueToken(csrfToken, 'csrf'),
          expiresAt: new Date(Date.now() + 60_000),
          lastUsedAt: new Date(),
        }) as never,
    );
    vi.spyOn(Member, 'findById').mockImplementation(() => queryResult(memberRecord) as never);
    const deleteSession = vi
      .spyOn(Session, 'deleteOne')
      .mockReturnValue(mutationResult({ deletedCount: 1 }) as never);
    vi.spyOn(AuditLog, 'create').mockResolvedValue({} as never);
    const cookie = `cavora_session=${sessionToken}; cavora_csrf=${csrfToken}`;

    const missingHeader = await request(app).post('/cavora/auth/logout').set('Cookie', cookie);
    expect(missingHeader.status).toBe(HttpCode.FORBIDDEN);
    expect(missingHeader.body.code).toBe(ErrorCode.CSRF_INVALID);
    expect(deleteSession).not.toHaveBeenCalled();

    const response = await request(app)
      .post('/cavora/auth/logout')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken);

    expect(response.status).toBe(HttpCode.NO_CONTENT);
    expect(deleteSession).toHaveBeenCalledWith({ _id: sessionId, memberId });
    expect(setCookieHeaders(response)).toHaveLength(2);
  });

  it('acknowledges forgot-password requests without revealing account existence', async () => {
    vi.spyOn(Member, 'findOne').mockReturnValue(queryResult(null) as never);

    const response = await request(app)
      .post('/cavora/auth/forgot-password')
      .send({ email: 'missing@example.com' });

    expect(response.status).toBe(HttpCode.OK);
    expect(response.body.message).toContain('If an active account exists');
    expect(accountEmailAdapter.passwordResets).toHaveLength(0);
  });

  it('completes one-time password reset and email verification workflows', async () => {
    const accountToken = {
      _id: new Types.ObjectId(),
      memberId,
      tokenHash: 'stored-token-hash',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
      createdAt,
      updatedAt: createdAt,
    };
    vi.spyOn(PasswordResetToken, 'findOneAndUpdate').mockReturnValue(
      queryResult(accountToken) as never,
    );
    vi.spyOn(EmailVerificationToken, 'findOneAndUpdate').mockReturnValue(
      queryResult(accountToken) as never,
    );
    vi.spyOn(Member, 'updateOne').mockReturnValue(mutationResult({ matchedCount: 1 }) as never);
    vi.spyOn(Session, 'deleteMany').mockReturnValue(mutationResult({ deletedCount: 2 }) as never);
    vi.spyOn(AuditLog, 'create').mockResolvedValue({} as never);

    const resetResponse = await request(app)
      .post('/cavora/auth/reset-password')
      .send({
        token: 'r'.repeat(43),
        password: 'new-password-123',
      });
    const verifyResponse = await request(app)
      .post('/cavora/auth/verify-email')
      .send({ token: 'v'.repeat(43) });

    expect(resetResponse.status).toBe(HttpCode.OK);
    expect(resetResponse.body.message).toContain('successfully');
    expect(setCookieHeaders(resetResponse)).toHaveLength(2);
    expect(verifyResponse.status).toBe(HttpCode.OK);
    expect(verifyResponse.body.message).toContain('verified');
  });

  it('updates only allowed profile fields behind authentication and CSRF protection', async () => {
    const csrfToken = 'csrf-token-for-profile-update';
    mockAuthentication(csrfToken);
    vi.mocked(Member.findById)
      .mockReturnValueOnce(queryResult(memberRecord) as never)
      .mockReturnValueOnce(queryResult(memberRecord) as never);
    vi.spyOn(Member, 'findOne').mockReturnValue(queryResult(null) as never);
    vi.spyOn(Member, 'findByIdAndUpdate').mockReturnValue(
      queryResult({ ...memberRecord, location: 'Seoul, South Korea' }) as never,
    );
    vi.spyOn(Booking, 'countDocuments').mockReturnValue(mutationResult(0) as never);
    vi.spyOn(Wishlist, 'countDocuments').mockReturnValue(mutationResult(0) as never);
    vi.spyOn(AuditLog, 'create').mockResolvedValue({} as never);
    const cookie = `cavora_session=session-profile; cavora_csrf=${csrfToken}`;

    const response = await request(app)
      .patch('/cavora/users/me')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send({ location: 'Seoul, South Korea', avatarUrl: '/img/member.jpg' });

    expect(response.status).toBe(HttpCode.OK);
    expect(response.body.data.location).toBe('Seoul, South Korea');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it('returns authenticated booking history and wishlist data', async () => {
    mockAuthentication();
    vi.spyOn(Booking, 'aggregate').mockReturnValue(
      mutationResult([{ metadata: [], data: [] }]) as unknown as ReturnType<
        typeof Booking.aggregate
      >,
    );
    vi.spyOn(Wishlist, 'aggregate').mockReturnValue(
      mutationResult([]) as unknown as ReturnType<typeof Wishlist.aggregate>,
    );
    const cookie = 'cavora_session=session-lists';

    const bookingsResponse = await request(app)
      .get('/cavora/users/me/bookings')
      .set('Cookie', cookie);
    const wishlistResponse = await request(app)
      .get('/cavora/users/me/wishlist')
      .set('Cookie', cookie);

    expect(bookingsResponse.status).toBe(HttpCode.OK);
    expect(bookingsResponse.body).toEqual({
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
    expect(wishlistResponse.status).toBe(HttpCode.OK);
    expect(wishlistResponse.body).toEqual({ data: [] });
  });

  it('adds and removes wishlist tours idempotently behind CSRF protection', async () => {
    const csrfToken = 'csrf-token-for-wishlist';
    mockAuthentication(csrfToken);
    const tour = {
      id: 1,
      slug: 'tour-one',
      country: 'Indonesia',
      place: 'Ubud',
      title: 'Tour One',
      location: 'Ubud',
      type: 'Cultural',
      priceCents: 10_000,
      currency: 'USD',
      ratingAverage: 4.8,
      reviewCount: 10,
      durationDays: 5,
      maxGroupSize: 12,
      images: [],
    };
    vi.spyOn(Tour, 'aggregate').mockReturnValue(
      mutationResult([tour]) as unknown as ReturnType<typeof Tour.aggregate>,
    );
    vi.spyOn(Wishlist, 'updateOne').mockReturnValue(mutationResult({ upsertedCount: 1 }) as never);
    vi.spyOn(Wishlist, 'deleteOne').mockReturnValue(mutationResult({ deletedCount: 1 }) as never);
    vi.spyOn(AuditLog, 'create').mockResolvedValue({} as never);
    const cookie = `cavora_session=session-wishlist; cavora_csrf=${csrfToken}`;

    const addResponse = await request(app)
      .put('/cavora/users/me/wishlist/1')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken);
    const removeResponse = await request(app)
      .delete('/cavora/users/me/wishlist/1')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken);

    expect(addResponse.status).toBe(HttpCode.OK);
    expect(addResponse.body.data.id).toBe(1);
    expect(removeResponse.status).toBe(HttpCode.NO_CONTENT);
  });
});
