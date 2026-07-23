import mongoose, { Schema } from 'mongoose';
import type { AccountToken } from '../libs/types/member';

const emailVerificationTokenSchema = new Schema<AccountToken>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: Date,
  },
  { timestamps: true, collection: 'email_verification_tokens' },
);

emailVerificationTokenSchema.index({ tokenHash: 1 }, { unique: true });
emailVerificationTokenSchema.index({ memberId: 1, createdAt: -1 });
emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<AccountToken>('EmailVerificationToken', emailVerificationTokenSchema);
