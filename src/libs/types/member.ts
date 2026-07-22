import type { Types } from 'mongoose';
import type { MemberRole, MemberStatus } from '../enums/member.enum';

export interface Member {
  _id: Types.ObjectId;
  email: string;
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  role: MemberRole;
  status: MemberStatus;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberInput {
  email: string;
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  role?: MemberRole;
}

export interface MemberUpdateInput {
  _id: Types.ObjectId;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  status?: MemberStatus;
}

export interface MemberInquiry {
  page: number;
  limit: number;
  role?: MemberRole;
  status?: MemberStatus;
  search?: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface Session {
  _id: Types.ObjectId;
  memberId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  lastUsedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountToken {
  _id: Types.ObjectId;
  memberId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
