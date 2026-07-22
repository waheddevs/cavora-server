import { model, Schema } from 'mongoose';
import type { AccountToken } from '../libs/types/member';

const passwordResetTokenSchema = new Schema<AccountToken>(
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
  { timestamps: true, collection: 'password_reset_tokens' },
);

passwordResetTokenSchema.index({ tokenHash: 1 }, { unique: true });
passwordResetTokenSchema.index({ memberId: 1, createdAt: -1 });
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model<AccountToken>('PasswordResetToken', passwordResetTokenSchema);
