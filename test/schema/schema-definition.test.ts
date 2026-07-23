import mongoose, {
  Types,
  type IndexDefinition,
  type IndexOptions as MongooseIndexOptions,
} from 'mongoose';
import { describe, expect, it } from 'vitest';
import { BookingStatus } from '../../src/libs/enums/booking.enum';
import AuditLog from '../../src/schema/AuditLog.model';
import BlogComment from '../../src/schema/BlogComment.model';
import BlogPost from '../../src/schema/BlogPost.model';
import Booking from '../../src/schema/Booking.model';
import ContactMessage from '../../src/schema/ContactMessage.model';
import EmailVerificationToken from '../../src/schema/EmailVerificationToken.model';
import Member from '../../src/schema/Member.model';
import NewsletterSubscription from '../../src/schema/NewsletterSubscription.model';
import PasswordResetToken from '../../src/schema/PasswordResetToken.model';
import Payment from '../../src/schema/Payment.model';
import Session from '../../src/schema/Session.model';
import Tour from '../../src/schema/Tour.model';
import TourDeparture from '../../src/schema/TourDeparture.model';
import TourImage from '../../src/schema/TourImage.model';
import Wishlist from '../../src/schema/Wishlist.model';

interface ExpectedIndexOptions {
  expireAfterSeconds?: number;
  unique?: boolean;
}

interface IndexedModel {
  modelName: string;
  schema: {
    indexes(): Array<[IndexDefinition, MongooseIndexOptions]>;
  };
}

async function getValidationError(document: { validate(): Promise<unknown> }) {
  let validationError: unknown;

  try {
    await document.validate();
  } catch (err) {
    validationError = err;
  }

  expect(validationError).toBeInstanceOf(mongoose.Error.ValidationError);
  return validationError as mongoose.Error.ValidationError;
}

function expectIndex(
  databaseModel: IndexedModel,
  expectedFields: Record<string, number | string>,
  expectedOptions: ExpectedIndexOptions = {},
): void {
  const index = databaseModel.schema
    .indexes()
    .find(([fields]) => JSON.stringify(fields) === JSON.stringify(expectedFields));

  expect(index, `${databaseModel.modelName} index ${JSON.stringify(expectedFields)}`).toBeDefined();
  expect(index?.[1]).toMatchObject(expectedOptions);
}

describe('Cavora schema definitions', () => {
  it('maps every model to its intended collection', () => {
    const collections = [
      Member,
      Session,
      PasswordResetToken,
      EmailVerificationToken,
      Tour,
      TourImage,
      TourDeparture,
      Wishlist,
      Booking,
      Payment,
      BlogPost,
      BlogComment,
      ContactMessage,
      NewsletterSubscription,
      AuditLog,
    ].map((databaseModel) => databaseModel.collection.collectionName);

    expect(collections).toEqual([
      'members',
      'sessions',
      'password_reset_tokens',
      'email_verification_tokens',
      'tours',
      'tour_images',
      'tour_departures',
      'wishlists',
      'bookings',
      'payments',
      'blog_posts',
      'blog_comments',
      'contact_messages',
      'newsletter_subscriptions',
      'audit_logs',
    ]);
  });

  it('declares security and expiration indexes', () => {
    expectIndex(Member, { email: 1 }, { unique: true });
    expectIndex(Member, { username: 1 }, { unique: true });
    expectIndex(Session, { tokenHash: 1 }, { unique: true });
    expectIndex(Session, { expiresAt: 1 }, { expireAfterSeconds: 0 });
    expectIndex(PasswordResetToken, { expiresAt: 1 }, { expireAfterSeconds: 0 });
    expectIndex(
      EmailVerificationToken,
      { expiresAt: 1 },
      {
        expireAfterSeconds: 0,
      },
    );
  });

  it('declares domain uniqueness indexes', () => {
    expectIndex(Tour, { slug: 1 }, { unique: true });
    expectIndex(TourImage, { tourId: 1, position: 1 }, { unique: true });
    expectIndex(Wishlist, { memberId: 1, tourId: 1 }, { unique: true });
    expectIndex(Booking, { reference: 1 }, { unique: true });
    expectIndex(Payment, { provider: 1, providerIntentId: 1 }, { unique: true });
    expectIndex(BlogPost, { slug: 1 }, { unique: true });
    expectIndex(NewsletterSubscription, { email: 1 }, { unique: true });
  });

  it('keeps password and token hashes out of normal projections', () => {
    expect(Member.schema.path('passwordHash').options.select).toBe(false);
    expect(Session.schema.path('tokenHash').options.select).toBe(false);
    expect(Session.schema.path('csrfTokenHash').options.select).toBe(false);
    expect(PasswordResetToken.schema.path('tokenHash').options.select).toBe(false);
    expect(EmailVerificationToken.schema.path('tokenHash').options.select).toBe(false);
    expect(NewsletterSubscription.schema.path('unsubscribeTokenHash').options.select).toBe(false);
  });

  it('rejects a member without required identity fields', async () => {
    const error = await getValidationError(new Member({ passwordHash: 'hash' }));

    expect(error?.errors.email).toBeDefined();
    expect(error?.errors.username).toBeDefined();
    expect(error?.errors.firstName).toBeDefined();
    expect(error?.errors.lastName).toBeDefined();
  });

  it('rejects invalid booking states and negative monetary values', async () => {
    const error = await getValidationError(
      new Booking({
        reference: 'CAVORA-TEST',
        memberId: new Types.ObjectId(),
        tourId: 1,
        departureId: new Types.ObjectId(),
        status: 'UNKNOWN',
        travelers: 2,
        unitPriceCents: -1,
        subtotalCents: 1_000,
        serviceFeeCents: 20,
        totalCents: 1_020,
        currency: 'USD',
        holdExpiresAt: new Date(),
      }),
    );

    expect(error?.errors.status).toBeDefined();
    expect(error?.errors.unitPriceCents).toBeDefined();
    expect(Object.values(BookingStatus)).not.toContain('UNKNOWN');
  });
});
