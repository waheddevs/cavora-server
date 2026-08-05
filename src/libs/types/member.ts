import type { Types } from 'mongoose';
import type { MemberRole, MemberStatus } from '../enums/member.enum';
import type { PaginationMeta } from './tour';

export interface Member {
  _id: Types.ObjectId;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
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
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  role?: MemberRole;
}

export interface MemberUpdateInput {
  _id: Types.ObjectId;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  status?: MemberStatus;
}

export interface MemberInquiry {
  limit: number;
  page: number;
  query?: string;
  role?: MemberRole;
  status?: MemberStatus;
}

export interface AdminMemberView {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  role: MemberRole;
  status: MemberStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMemberStats {
  total: number;
  active: number;
  blocked: number;
  deleted: number;
}

export interface PaginatedAdminMembers {
  data: AdminMemberView[];
  meta: PaginationMeta;
  stats: AdminMemberStats;
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
  csrfTokenHash: string;
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

export interface RequestContext {
  ipAddress?: string;
  requestId: string;
  userAgent?: string;
}

export interface AuthContext {
  csrfTokenHash: string;
  memberId: Types.ObjectId;
  role: MemberRole;
  sessionId: Types.ObjectId;
}

export interface MemberView {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  role: MemberRole;
  status: MemberStatus;
  emailVerified: boolean;
  createdAt: string;
}

export interface MemberProfileResult extends MemberView {
  lastSignInAt?: string;
  stats: {
    activeSessions: number;
    bookings: number;
    wishlist: number;
  };
}

export interface SessionTokens {
  csrfToken: string;
  expiresAt: Date;
  sessionToken: string;
}

export interface AuthenticationResult {
  member: MemberView;
  tokens: SessionTokens;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  password: string;
  token: string;
}

export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface ProfileUpdateInput {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
}
