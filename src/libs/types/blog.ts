import type { Types } from 'mongoose';
import type { BlogCommentStatus, BlogPostStatus } from '../enums/blog.enum';

export interface BlogPost {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  excerpt: string;
  body: unknown;
  category: string;
  imageUrl: string;
  authorName: string;
  authorImageUrl?: string;
  status: BlogPostStatus;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogPostInquiry {
  page: number;
  limit: number;
  category?: string;
}

export interface BlogComment {
  _id: Types.ObjectId;
  postId: Types.ObjectId;
  memberId?: Types.ObjectId;
  name: string;
  email: string;
  body: string;
  status: BlogCommentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogCommentInput {
  postId: Types.ObjectId;
  memberId?: Types.ObjectId;
  name: string;
  email: string;
  body: string;
}
