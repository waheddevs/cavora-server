import { model, Schema } from 'mongoose';
import { NewsletterSubscriptionStatus } from '../libs/enums/engagement.enum';
import type { NewsletterSubscription } from '../libs/types/engagement';

const newsletterSubscriptionSchema = new Schema<NewsletterSubscription>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    status: {
      type: String,
      enum: Object.values(NewsletterSubscriptionStatus),
      default: NewsletterSubscriptionStatus.PENDING,
    },
    source: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    consentedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    confirmedAt: Date,
    unsubscribeTokenHash: {
      type: String,
      required: true,
      select: false,
    },
  },
  { timestamps: true, collection: 'newsletter_subscriptions' },
);

newsletterSubscriptionSchema.index({ email: 1 }, { unique: true });
newsletterSubscriptionSchema.index({ unsubscribeTokenHash: 1 }, { unique: true });
newsletterSubscriptionSchema.index({ status: 1, createdAt: -1 });

export default model<NewsletterSubscription>(
  'NewsletterSubscription',
  newsletterSubscriptionSchema,
);
