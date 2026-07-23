import mongoose, { Schema } from 'mongoose';
import type { Session } from '../libs/types/member';

const sessionSchema = new Schema<Session>(
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
    csrfTokenHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    lastUsedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      maxlength: 64,
    },
    userAgent: {
      type: String,
      maxlength: 1_024,
    },
  },
  { timestamps: true, collection: 'sessions' },
);

sessionSchema.index({ tokenHash: 1 }, { unique: true });
sessionSchema.index({ memberId: 1, expiresAt: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<Session>('Session', sessionSchema);
