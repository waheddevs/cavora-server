import { Types } from 'mongoose';
import { MemberStatus, MemberType } from '../enums/member.enum';

export interface Member {
  _id: Types.ObjectId;
  memberType: MemberType;
  memberStatus: MemberStatus;
  memberNick: string;
  memberPassword: string;
  memberPhone: string;
  memberAddress?: string;
  memberDesc?: string;
  memberImage?: string;
  memberPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberInput {
  memberType?: MemberType;
  memberNick: string;
  memberPassword: string;
  memberPhone: string;
  memberAddress?: string;
  memberDesc?: string;
  memberImage?: string;
}

export interface MemberUpdateInput {
  _id: Types.ObjectId;
  memberNick?: string;
  memberPassword?: string;
  memberPhone?: string;
  memberAddress?: string;
  memberDesc?: string;
  memberImage?: string;
  memberStatus?: MemberStatus;
}

export interface LoginInput {
  memberNick: string;
  memberPassword: string;
}

export interface MemberInquiry {
  page: number;
  limit: number;
  order?: string;
  memberStatus?: MemberStatus;
  search?: string;
}
