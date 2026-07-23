import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryAccountEmailAdapter } from '../common/email/account-email.adapter';
import { ErrorCode } from '../common/errors/error-codes';
import type { PasswordAdapter } from '../common/security/passwords';
import { BookingStatus } from '../libs/enums/booking.enum';
import AuditLog from '../schema/AuditLog.model';
import Booking from '../schema/Booking.model';
import Member from '../schema/Member.model';
import PasswordResetToken from '../schema/PasswordResetToken.model';
import Session from '../schema/Session.model';
import Tour from '../schema/Tour.model';
import Wishlist from '../schema/Wishlist.model';
import MemberService from './Member.service';

function queryResult<T>(value: T) {
  return {
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(value),
  };
}

function mutationResult(value: unknown = {}) {
  return { exec: vi.fn().mockResolvedValue(value) };
}

const now = new Date('2026-07-23T00:00:00.000Z');
const memberId = new Types.ObjectId();
const tokenId = new Types.ObjectId();
const passwordAdapter: PasswordAdapter = {
  hash: vi.fn().mockResolvedValue('argon2id-password-hash'),
  verify: vi.fn().mockResolvedValue(true),
};
const context = {
  requestId: 'request-123',
  ipAddress: '127.0.0.1',
  userAgent: 'Vitest',
};
const tourSummary = {
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

describe('MemberService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps forgot-password responses non-enumerating', async () => {
    const emailAdapter = new MemoryAccountEmailAdapter();
    const service = new MemberService(emailAdapter, passwordAdapter, () => now);
    const findQuery = {
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(null),
    };
    vi.spyOn(Member, 'findOne').mockReturnValue(findQuery as never);
    const createToken = vi.spyOn(PasswordResetToken, 'create');

    const result = await service.forgotPassword({ email: 'missing@example.com' }, context);

    expect(result.message).not.toContain('missing');
    expect(createToken).not.toHaveBeenCalled();
    expect(emailAdapter.passwordResets).toHaveLength(0);
  });

  it('consumes a reset token, replaces the password, and revokes every session', async () => {
    const service = new MemberService(new MemoryAccountEmailAdapter(), passwordAdapter, () => now);
    const resetToken = {
      _id: tokenId,
      memberId,
      tokenHash: 'stored-hash',
      expiresAt: new Date(now.getTime() + 60_000),
      usedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const consumeToken = vi
      .spyOn(PasswordResetToken, 'findOneAndUpdate')
      .mockReturnValue(queryResult(resetToken) as never);
    const updateMember = vi
      .spyOn(Member, 'updateOne')
      .mockReturnValue(mutationResult({ matchedCount: 1 }) as never);
    const deleteSessions = vi
      .spyOn(Session, 'deleteMany')
      .mockReturnValue(mutationResult({ deletedCount: 2 }) as never);
    vi.spyOn(AuditLog, 'create').mockResolvedValue({} as never);

    const result = await service.resetPassword(
      { token: 'opaque-reset-token-value', password: 'new-password' },
      context,
    );

    expect(result.message).toContain('successfully');
    expect(consumeToken).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        usedAt: { $exists: false },
      }),
      { $set: { usedAt: now } },
      { new: true },
    );
    expect(updateMember).toHaveBeenCalledWith(expect.objectContaining({ _id: memberId }), {
      $set: { passwordHash: 'argon2id-password-hash' },
    });
    expect(deleteSessions).toHaveBeenCalledWith({ memberId });
  });

  it('rejects an invalid or already-used reset token without changing a member', async () => {
    const service = new MemberService(new MemoryAccountEmailAdapter(), passwordAdapter, () => now);
    vi.spyOn(PasswordResetToken, 'findOneAndUpdate').mockReturnValue(queryResult(null) as never);
    const updateMember = vi.spyOn(Member, 'updateOne');

    await expect(
      service.resetPassword(
        { token: 'already-used-token-value', password: 'new-password' },
        context,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_ACCOUNT_TOKEN });
    expect(updateMember).not.toHaveBeenCalled();
  });

  it('adds wishlist tours idempotently and audits only the first insert', async () => {
    const service = new MemberService(new MemoryAccountEmailAdapter(), passwordAdapter, () => now);
    vi.spyOn(Tour, 'aggregate').mockReturnValue(
      mutationResult([tourSummary]) as unknown as ReturnType<typeof Tour.aggregate>,
    );
    vi.spyOn(Wishlist, 'updateOne').mockReturnValue(mutationResult({ upsertedCount: 0 }) as never);
    const audit = vi.spyOn(AuditLog, 'create');

    await expect(service.addWishlistTour(memberId, 1, context)).resolves.toEqual(tourSummary);
    expect(audit).not.toHaveBeenCalled();
  });

  it('returns booking history with server pagination and ISO timestamps', async () => {
    const service = new MemberService(new MemoryAccountEmailAdapter(), passwordAdapter, () => now);
    vi.spyOn(Booking, 'aggregate').mockReturnValue(
      mutationResult([
        {
          metadata: [{ total: 1 }],
          data: [
            {
              id: tokenId.toString(),
              reference: 'CAVORA-1',
              status: BookingStatus.CONFIRMED,
              tourId: 1,
              departureId: new Types.ObjectId().toString(),
              travelers: 2,
              totalCents: 20_400,
              currency: 'USD',
              holdExpiresAt: now,
              createdAt: now,
              tour: tourSummary,
            },
          ],
        },
      ]) as unknown as ReturnType<typeof Booking.aggregate>,
    );

    const result = await service.getBookings(memberId, { page: 1, limit: 10 });

    expect(result.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    expect(result.data[0]).toMatchObject({
      reference: 'CAVORA-1',
      createdAt: now.toISOString(),
      holdExpiresAt: now.toISOString(),
    });
  });
});
