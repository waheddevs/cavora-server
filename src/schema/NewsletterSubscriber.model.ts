import mongoose, { Schema } from 'mongoose';
import { NewsletterSource, NewsletterStatus } from '../libs/enums/engagement.enum';
import type { NewsletterSubscriber } from '../libs/types/engagement';

const newsletterSubscriberSchema = new Schema<NewsletterSubscriber>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    source: {
      type: String,
      required: true,
      enum: Object.values(NewsletterSource),
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(NewsletterStatus),
      default: NewsletterStatus.ACTIVE,
    },
    subscribedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true, collection: 'newsletter_subscribers' },
);

newsletterSubscriberSchema.index({ email: 1 }, { unique: true });
newsletterSubscriberSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<NewsletterSubscriber>(
  'NewsletterSubscriber',
  newsletterSubscriberSchema,
);
