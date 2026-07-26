import type { PipelineStage, Types } from 'mongoose';
import { AppError } from '../common/errors/app-error';
import { ErrorCode, HttpCode } from '../common/errors/error-codes';
import {
  accountEmailAdapter,
  type AccountEmailAdapter,
} from '../common/email/account-email.adapter';
import { argonPasswordAdapter, type PasswordAdapter } from '../common/security/passwords';
import { createOpaqueToken, hashOpaqueToken } from '../common/security/tokens';
import { env } from '../config/env';
import { AuditActorType } from '../libs/enums/audit.enum';
import { MemberRole, MemberStatus } from '../libs/enums/member.enum';
import { TourStatus } from '../libs/enums/tour.enum';
import type {
  MemberBookingHistory,
  MemberBookingView,
  BookingInquiry,
} from '../libs/types/booking';
import type {
  AccountToken,
  AuthenticationResult,
  AuthContext,
  ForgotPasswordInput,
  LoginInput,
  Member,
  MemberProfileResult,
  MemberView,
  ProfileUpdateInput,
  RegisterInput,
  RequestContext,
  ResetPasswordInput,
  Session as MemberSession,
  SessionTokens,
  VerifyEmailInput,
} from '../libs/types/member';
import type { TourSummary } from '../libs/types/tour';
import type { WishlistResult } from '../libs/types/wishlist';
import AuditLog from '../schema/AuditLog.model';
import Booking from '../schema/Booking.model';
import EmailVerificationToken from '../schema/EmailVerificationToken.model';
import MemberModel from '../schema/Member.model';
import PasswordResetToken from '../schema/PasswordResetToken.model';
import Session from '../schema/Session.model';
import Tour from '../schema/Tour.model';
import Wishlist from '../schema/Wishlist.model';

type MemberViewSource = Pick<
  Member,
  | '_id'
  | 'avatarUrl'
  | 'createdAt'
  | 'email'
  | 'emailVerifiedAt'
  | 'firstName'
  | 'lastName'
  | 'location'
  | 'phone'
  | 'role'
  | 'username'
>;

interface BookingFacetResult {
  data: Array<
    Omit<MemberBookingView, 'createdAt' | 'holdExpiresAt'> & {
      createdAt: Date;
      holdExpiresAt: Date;
    }
  >;
  metadata: Array<{ total: number }>;
}

interface MongoDuplicateKeyError {
  code: number;
  keyPattern?: Record<string, number>;
}

function isMongoDuplicateKeyError(err: unknown): err is MongoDuplicateKeyError {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 11_000;
}

function toMemberView(member: MemberViewSource): MemberView {
  return {
    id: member._id.toString(),
    email: member.email,
    username: member.username,
    firstName: member.firstName,
    lastName: member.lastName,
    ...(member.phone !== undefined ? { phone: member.phone } : {}),
    ...(member.location !== undefined ? { location: member.location } : {}),
    ...(member.avatarUrl !== undefined ? { avatarUrl: member.avatarUrl } : {}),
    role: member.role,
    emailVerified: member.emailVerifiedAt !== undefined && member.emailVerifiedAt !== null,
    createdAt: member.createdAt.toISOString(),
  };
}

function accountUrl(baseUrl: string, token: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

function authenticationRequired(): AppError {
  return new AppError(
    HttpCode.UNAUTHORIZED,
    ErrorCode.AUTHENTICATION_REQUIRED,
    'Authentication is required.',
  );
}

class MemberService {
  public constructor(
    private readonly emailAdapter: AccountEmailAdapter = accountEmailAdapter,
    private readonly passwordAdapter: PasswordAdapter = argonPasswordAdapter,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async register(
    input: RegisterInput,
    context: RequestContext,
  ): Promise<AuthenticationResult> {
    await this.assertIdentityAvailable(input.email, input.username);
    const passwordHash = await this.passwordAdapter.hash(input.password);

    try {
      const member = await MemberModel.create({
        email: input.email,
        username: input.username,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
      });
      const verificationToken = await this.createEmailVerification(member._id);
      const tokens = await this.createSession(member._id, context);

      await Promise.all([
        this.emailAdapter.sendVerification({
          email: member.email,
          url: accountUrl(env.EMAIL_VERIFICATION_URL, verificationToken),
        }),
        this.writeAudit(member._id, 'account.registered', 'member', member._id.toString(), context),
      ]);

      return { member: toMemberView(member.toObject()), tokens };
    } catch (err) {
      this.throwIdentityConflict(err);
    }
  }

  public async registerAdmin(
    input: RegisterInput,
    context: RequestContext,
  ): Promise<AuthenticationResult> {
    const adminCount = await MemberModel.countDocuments({ role: MemberRole.ADMIN });
    if (adminCount > 0) this.throwAdminAlreadyExists();
    await MemberModel.createIndexes();
    const adminCreatedWhileIndexing = await MemberModel.exists({ role: MemberRole.ADMIN });
    if (adminCreatedWhileIndexing) this.throwAdminAlreadyExists();
    await this.assertIdentityAvailable(input.email, input.username);
    const passwordHash = await this.passwordAdapter.hash(input.password);

    try {
      const member = await MemberModel.create({
        email: input.email,
        username: input.username,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: MemberRole.ADMIN,
        emailVerifiedAt: this.now(),
      });
      const tokens = await this.createSession(member._id, context);
      await this.writeAudit(
        member._id,
        'admin.registered',
        'member',
        member._id.toString(),
        context,
      );
      return { member: toMemberView(member.toObject()), tokens };
    } catch (err) {
      this.throwIdentityConflict(err);
    }
  }

  public async login(input: LoginInput, context: RequestContext): Promise<AuthenticationResult> {
    const member = await MemberModel.findOne({ email: input.email })
      .select('+passwordHash')
      .lean<Member>()
      .exec();
    if (!member || !(await this.passwordAdapter.verify(member.passwordHash, input.password))) {
      throw new AppError(
        HttpCode.UNAUTHORIZED,
        ErrorCode.INVALID_CREDENTIALS,
        'Email or password is incorrect.',
      );
    }
    if (member.status !== MemberStatus.ACTIVE) {
      throw new AppError(
        HttpCode.FORBIDDEN,
        ErrorCode.ACCOUNT_UNAVAILABLE,
        'This account is not available.',
      );
    }

    const tokens = await this.createSession(member._id, context);
    await this.writeAudit(member._id, 'account.logged_in', 'session', undefined, context);

    return { member: toMemberView(member), tokens };
  
  }

  public async authenticateSession(sessionToken: string | undefined): Promise<AuthContext> {
    if (!sessionToken) throw authenticationRequired();

    const now = this.now();
    const tokenHash = hashOpaqueToken(sessionToken, 'session');
    const session = await Session.findOne({ tokenHash, expiresAt: { $gt: now } })
      .select('+csrfTokenHash')
      .lean<MemberSession>()
      .exec();
    if (!session) throw authenticationRequired();

    const member = await MemberModel.findById(session.memberId)
      .select({ role: 1, status: 1 })
      .lean<Member>()
      .exec();
    if (!member || member.status !== MemberStatus.ACTIVE) {
      await Session.deleteOne({ _id: session._id }).exec();
      throw authenticationRequired();
    }

    if (now.getTime() - session.lastUsedAt.getTime() >= 5 * 60 * 1_000) {
      await Session.updateOne({ _id: session._id }, { $set: { lastUsedAt: now } }).exec();
    }

    return {
      memberId: member._id,
      role: member.role,
      sessionId: session._id,
      csrfTokenHash: session.csrfTokenHash,
    };
  }

  public async logout(auth: AuthContext, context: RequestContext): Promise<void> {
    await Session.deleteOne({ _id: auth.sessionId, memberId: auth.memberId }).exec();
    await this.writeAudit(
      auth.memberId,
      'account.logged_out',
      'session',
      auth.sessionId.toString(),
      context,
    );
  }

  public async forgotPassword(
    input: ForgotPasswordInput,
    context: RequestContext,
  ): Promise<{ message: string }> {
    const response = {
      message: 'If an active account exists for that email, a reset link has been prepared.',
    };
    const member = await MemberModel.findOne({
      email: input.email,
      status: MemberStatus.ACTIVE,
    })
      .select({ email: 1 })
      .lean<Member>()
      .exec();
    if (!member) return response;

    const now = this.now();
    await PasswordResetToken.updateMany(
      { memberId: member._id, usedAt: { $exists: false } },
      { $set: { usedAt: now } },
    ).exec();
    const token = createOpaqueToken();
    await PasswordResetToken.create({
      memberId: member._id,
      tokenHash: hashOpaqueToken(token, 'password-reset'),
      expiresAt: new Date(now.getTime() + 30 * 60 * 1_000),
    });
    await Promise.all([
      this.emailAdapter.sendPasswordReset({
        email: member.email,
        url: accountUrl(env.PASSWORD_RESET_URL, token),
      }),
      this.writeAudit(
        member._id,
        'account.password_reset_requested',
        'member',
        member._id.toString(),
        context,
      ),
    ]);

    return response;
  }

  public async resetPassword(
    input: ResetPasswordInput,
    context: RequestContext,
  ): Promise<{ message: string }> {
    const now = this.now();
    const passwordHash = await this.passwordAdapter.hash(input.password);
    const token = await PasswordResetToken.findOneAndUpdate(
      {
        tokenHash: hashOpaqueToken(input.token, 'password-reset'),
        usedAt: { $exists: false },
        expiresAt: { $gt: now },
      },
      { $set: { usedAt: now } },
      { new: true },
    )
      .lean<AccountToken>()
      .exec();
    if (!token) this.throwInvalidAccountToken();

    const updated = await MemberModel.updateOne(
      { _id: token.memberId, status: MemberStatus.ACTIVE },
      { $set: { passwordHash } },
    ).exec();
    if (updated.matchedCount === 0) this.throwInvalidAccountToken();

    await Session.deleteMany({ memberId: token.memberId }).exec();
    await this.writeAudit(
      token.memberId,
      'account.password_reset',
      'member',
      token.memberId.toString(),
      context,
    );

    return { message: 'Password reset successfully. Please log in again.' };
  }

  public async verifyEmail(
    input: VerifyEmailInput,
    context: RequestContext,
  ): Promise<{ message: string }> {
    const now = this.now();
    const token = await EmailVerificationToken.findOneAndUpdate(
      {
        tokenHash: hashOpaqueToken(input.token, 'email-verification'),
        usedAt: { $exists: false },
        expiresAt: { $gt: now },
      },
      { $set: { usedAt: now } },
      { new: true },
    )
      .lean<AccountToken>()
      .exec();
    if (!token) this.throwInvalidAccountToken();

    const updated = await MemberModel.updateOne(
      { _id: token.memberId, status: MemberStatus.ACTIVE },
      { $set: { emailVerifiedAt: now } },
    ).exec();
    if (updated.matchedCount === 0) this.throwInvalidAccountToken();

    await this.writeAudit(
      token.memberId,
      'account.email_verified',
      'member',
      token.memberId.toString(),
      context,
    );
    return { message: 'Email verified successfully.' };
  }

  public async getProfile(memberId: Types.ObjectId): Promise<MemberProfileResult> {
    const member = await MemberModel.findById(memberId).lean<Member>().exec();
    if (!member) {
      throw new AppError(HttpCode.NOT_FOUND, ErrorCode.MEMBER_NOT_FOUND, 'Member not found.');
    }
    return this.buildProfile(member);
  }

  public async updateProfile(
    auth: AuthContext,
    input: ProfileUpdateInput,
    context: RequestContext,
  ): Promise<MemberProfileResult> {
    const current = await MemberModel.findById(auth.memberId).lean<Member>().exec();
    if (!current) {
      throw new AppError(HttpCode.NOT_FOUND, ErrorCode.MEMBER_NOT_FOUND, 'Member not found.');
    }

    const nextEmail = input.email ?? current.email;
    const nextUsername = input.username ?? current.username;
    await this.assertIdentityAvailable(nextEmail, nextUsername, auth.memberId);

    const setFields: Record<string, string> = {};
    const unsetFields: Record<string, 1> = {};
    for (const field of ['email', 'username', 'firstName', 'lastName'] as const) {
      if (input[field] !== undefined) setFields[field] = input[field];
    }
    for (const field of ['phone', 'location', 'avatarUrl'] as const) {
      const value = input[field];
      if (value === undefined) continue;
      if (value === '') unsetFields[field] = 1;
      else setFields[field] = value;
    }

    const emailChanged = input.email !== undefined && input.email !== current.email;
    if (emailChanged) unsetFields.emailVerifiedAt = 1;
    const update: Record<string, unknown> = { $set: setFields };
    if (Object.keys(unsetFields).length > 0) update.$unset = unsetFields;

    try {
      const member = await MemberModel.findByIdAndUpdate(auth.memberId, update, {
        new: true,
        runValidators: true,
      })
        .lean<Member>()
        .exec();
      if (!member) {
        throw new AppError(HttpCode.NOT_FOUND, ErrorCode.MEMBER_NOT_FOUND, 'Member not found.');
      }

      if (emailChanged) {
        await Session.deleteMany({
          memberId: auth.memberId,
          _id: { $ne: auth.sessionId },
        }).exec();
        const verificationToken = await this.createEmailVerification(auth.memberId);
        await this.emailAdapter.sendVerification({
          email: member.email,
          url: accountUrl(env.EMAIL_VERIFICATION_URL, verificationToken),
        });
      }

      await this.writeAudit(
        auth.memberId,
        'account.profile_updated',
        'member',
        auth.memberId.toString(),
        context,
        { fields: Object.keys(input) },
      );
      return this.buildProfile(member);
    } catch (err) {
      if (err instanceof AppError) throw err;
      this.throwIdentityConflict(err);
    }
  }

  public async getBookings(
    memberId: Types.ObjectId,
    inquiry: BookingInquiry,
  ): Promise<MemberBookingHistory> {
    const match: Record<string, unknown> = { memberId };
    if (inquiry.status) match.status = inquiry.status;

    const pipeline: PipelineStage[] = [
      { $match: match },
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: (inquiry.page - 1) * inquiry.limit },
            { $limit: inquiry.limit },
            {
              $lookup: {
                from: 'tours',
                localField: 'tourId',
                foreignField: '_id',
                as: 'tour',
              },
            },
            { $unwind: { path: '$tour', preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: 'tour_images',
                let: { currentTourId: '$tourId' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$tourId', '$$currentTourId'] } } },
                  { $sort: { position: 1 } },
                  { $project: { _id: 0, url: 1, altText: 1, position: 1 } },
                ],
                as: 'tourImages',
              },
            },
            {
              $project: {
                _id: 0,
                id: { $toString: '$_id' },
                reference: 1,
                status: 1,
                tourId: 1,
                departureId: { $toString: '$departureId' },
                travelers: 1,
                totalCents: 1,
                currency: 1,
                holdExpiresAt: 1,
                createdAt: 1,
                tour: {
                  $cond: [
                    { $ne: [{ $type: '$tour._id' }, 'missing'] },
                    {
                      id: '$tour._id',
                      slug: '$tour.slug',
                      country: '$tour.country',
                      place: '$tour.place',
                      title: '$tour.title',
                      location: '$tour.location',
                      type: '$tour.type',
                      priceCents: '$tour.priceCents',
                      oldPriceCents: '$tour.oldPriceCents',
                      currency: '$tour.currency',
                      ratingAverage: '$tour.ratingAverage',
                      reviewCount: '$tour.reviewCount',
                      durationDays: '$tour.durationDays',
                      maxGroupSize: '$tour.maxGroupSize',
                      images: '$tourImages',
                    },
                    null,
                  ],
                },
              },
            },
          ],
        },
      },
    ];
    const [result] = await Booking.aggregate<BookingFacetResult>(pipeline).exec();
    const total = result?.metadata[0]?.total ?? 0;

    return {
      data: (result?.data ?? []).map((booking) => ({
        ...booking,
        createdAt: booking.createdAt.toISOString(),
        holdExpiresAt: booking.holdExpiresAt.toISOString(),
      })),
      meta: {
        page: inquiry.page,
        limit: inquiry.limit,
        total,
        totalPages: Math.ceil(total / inquiry.limit),
      },
    };
  }

  public async getWishlist(memberId: Types.ObjectId): Promise<WishlistResult> {
    const data = await Wishlist.aggregate<TourSummary>([
      { $match: { memberId } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'tours',
          let: { savedTourId: '$tourId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$savedTourId'] },
                status: TourStatus.PUBLISHED,
              },
            },
          ],
          as: 'tour',
        },
      },
      { $unwind: '$tour' },
      {
        $lookup: {
          from: 'tour_images',
          let: { savedTourId: '$tourId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$tourId', '$$savedTourId'] } } },
            { $sort: { position: 1 } },
            { $project: { _id: 0, url: 1, altText: 1, position: 1 } },
          ],
          as: 'images',
        },
      },
      {
        $project: {
          _id: 0,
          id: '$tour._id',
          slug: '$tour.slug',
          country: '$tour.country',
          place: '$tour.place',
          title: '$tour.title',
          location: '$tour.location',
          type: '$tour.type',
          priceCents: '$tour.priceCents',
          oldPriceCents: '$tour.oldPriceCents',
          currency: '$tour.currency',
          ratingAverage: '$tour.ratingAverage',
          reviewCount: '$tour.reviewCount',
          durationDays: '$tour.durationDays',
          maxGroupSize: '$tour.maxGroupSize',
          images: 1,
        },
      },
    ]).exec();

    return { data };
  }

  public async addWishlistTour(
    memberId: Types.ObjectId,
    tourId: number,
    context: RequestContext,
  ): Promise<TourSummary> {
    const tour = await this.getPublishedTourSummary(tourId);
    if (!tour) {
      throw new AppError(HttpCode.NOT_FOUND, ErrorCode.TOUR_NOT_FOUND, 'Tour not found.');
    }

    const result = await Wishlist.updateOne(
      { memberId, tourId },
      { $setOnInsert: { memberId, tourId } },
      { upsert: true },
    ).exec();
    if (result.upsertedCount > 0) {
      await this.writeAudit(memberId, 'wishlist.tour_added', 'tour', tourId.toString(), context);
    }
    return tour;
  }

  public async removeWishlistTour(
    memberId: Types.ObjectId,
    tourId: number,
    context: RequestContext,
  ): Promise<void> {
    const result = await Wishlist.deleteOne({ memberId, tourId }).exec();
    if (result.deletedCount > 0) {
      await this.writeAudit(memberId, 'wishlist.tour_removed', 'tour', tourId.toString(), context);
    }
  }

  private async assertIdentityAvailable(
    email: string,
    username: string,
    excludeMemberId?: Types.ObjectId,
  ): Promise<void> {
    const conditions: Record<string, unknown> = {
      $or: [{ email }, { username }],
    };
    if (excludeMemberId) conditions._id = { $ne: excludeMemberId };
    const existing = await MemberModel.findOne(conditions)
      .collation({ locale: 'en', strength: 2 })
      .select({ email: 1, username: 1 })
      .lean<Member>()
      .exec();
    if (!existing) return;

    if (existing.email === email) {
      throw new AppError(
        HttpCode.CONFLICT,
        ErrorCode.EMAIL_ALREADY_REGISTERED,
        'Email is already registered.',
        { fieldErrors: { 'body.email': 'Email is already registered.' } },
      );
    }
    throw new AppError(
      HttpCode.CONFLICT,
      ErrorCode.USERNAME_ALREADY_TAKEN,
      'Username is already taken.',
      { fieldErrors: { 'body.username': 'Username is already taken.' } },
    );
  }

  private throwIdentityConflict(err: unknown): never {
    if (isMongoDuplicateKeyError(err)) {
      if (err.keyPattern?.email) {
        throw new AppError(
          HttpCode.CONFLICT,
          ErrorCode.EMAIL_ALREADY_REGISTERED,
          'Email is already registered.',
          { fieldErrors: { 'body.email': 'Email is already registered.' } },
        );
      }
      if (err.keyPattern?.username) {
        throw new AppError(
          HttpCode.CONFLICT,
          ErrorCode.USERNAME_ALREADY_TAKEN,
          'Username is already taken.',
          { fieldErrors: { 'body.username': 'Username is already taken.' } },
        );
      }
      if (err.keyPattern?.role) this.throwAdminAlreadyExists();
    }
    throw err;
  }

  private throwAdminAlreadyExists(): never {
    throw new AppError(
      HttpCode.CONFLICT,
      ErrorCode.RESOURCE_CONFLICT,
      'The administrator account already exists. Sign in instead.',
    );
  }

  private throwInvalidAccountToken(): never {
    throw new AppError(
      HttpCode.UNPROCESSABLE_ENTITY,
      ErrorCode.INVALID_ACCOUNT_TOKEN,
      'The account token is invalid or expired.',
    );
  }

  private async createSession(
    memberId: Types.ObjectId,
    context: RequestContext,
  ): Promise<SessionTokens> {
    const sessionToken = createOpaqueToken();
    const csrfToken = createOpaqueToken();
    const expiresAt = new Date(this.now().getTime() + env.SESSION_TTL_HOURS * 60 * 60 * 1_000);
    await Session.create({
      memberId,
      tokenHash: hashOpaqueToken(sessionToken, 'session'),
      csrfTokenHash: hashOpaqueToken(csrfToken, 'csrf'),
      expiresAt,
      lastUsedAt: this.now(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    return { sessionToken, csrfToken, expiresAt };
  }

  private async createEmailVerification(memberId: Types.ObjectId): Promise<string> {
    const now = this.now();
    await EmailVerificationToken.updateMany(
      { memberId, usedAt: { $exists: false } },
      { $set: { usedAt: now } },
    ).exec();
    const token = createOpaqueToken();
    await EmailVerificationToken.create({
      memberId,
      tokenHash: hashOpaqueToken(token, 'email-verification'),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1_000),
    });
    return token;
  }

  private async buildProfile(member: MemberViewSource): Promise<MemberProfileResult> {
    const [bookings, wishlist] = await Promise.all([
      Booking.countDocuments({ memberId: member._id }).exec(),
      Wishlist.countDocuments({ memberId: member._id }).exec(),
    ]);
    return { ...toMemberView(member), stats: { bookings, wishlist } };
  }

  private async getPublishedTourSummary(tourId: number): Promise<TourSummary | null> {
    const [tour] = await Tour.aggregate<TourSummary>([
      { $match: { _id: tourId, status: TourStatus.PUBLISHED } },
      {
        $lookup: {
          from: 'tour_images',
          let: { currentTourId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$tourId', '$$currentTourId'] } } },
            { $sort: { position: 1 } },
            { $project: { _id: 0, url: 1, altText: 1, position: 1 } },
          ],
          as: 'images',
        },
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          slug: 1,
          country: 1,
          place: 1,
          title: 1,
          location: 1,
          type: 1,
          priceCents: 1,
          oldPriceCents: 1,
          currency: 1,
          ratingAverage: 1,
          reviewCount: 1,
          durationDays: 1,
          maxGroupSize: 1,
          images: 1,
        },
      },
    ]).exec();
    return tour ?? null;
  }

  private async writeAudit(
    actorId: Types.ObjectId,
    action: string,
    entityType: string,
    entityId: string | undefined,
    context: RequestContext,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await AuditLog.create({
      actorType: AuditActorType.MEMBER,
      actorId,
      action,
      entityType,
      entityId,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      metadata,
    });
  }
}

export default MemberService;
