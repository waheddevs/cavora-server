import { Schema, model } from 'mongoose';
import { MemberStatus, MemberType } from '../libs/enums/member.enum';

const memberSchema = new Schema(
  {
    memberType: {
      type: String,
      enum: MemberType,
      default: MemberType.USER,
    },
    memberStatus: {
      type: String,
      enum: MemberStatus,
      default: MemberStatus.ACTIVE,
    },
    memberNick: {
      type: String,
      required: true,
      unique: true,
    },
    memberPassword: {
      type: String,
      required: true,
      select: false,
    },
    memberPhone: {
      type: String,
      required: true,
      unique: true,
    },
    memberAddress: {
      type: String,
    },
    memberDesc: {
      type: String,
    },
    memberImage: {
      type: String,
    },
    memberPoints: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, collection: 'members' },
);

export default model('Member', memberSchema);
