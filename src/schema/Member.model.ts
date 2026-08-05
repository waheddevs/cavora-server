import mongoose, { Schema } from 'mongoose';
import { MemberRole, MemberStatus } from '../libs/enums/member.enum';
import type { Member } from '../libs/types/member';

const memberSchema = new Schema<Member>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 40,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 2_048,
    },
    role: {
      type: String,
      enum: Object.values(MemberRole),
      default: MemberRole.USER,
    },
    status: {
      type: String,
      enum: Object.values(MemberStatus),
      default: MemberStatus.ACTIVE,
    },
    emailVerifiedAt: Date,
  },
  { timestamps: true, collection: 'members' },
);

memberSchema.index({ email: 1 }, { unique: true });
memberSchema.index({ username: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
memberSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: { role: MemberRole.ADMIN },
    name: 'single_admin_role',
  },
);
memberSchema.index({ role: 1, status: 1, createdAt: -1 });

export default mongoose.model<Member>('Member', memberSchema);
