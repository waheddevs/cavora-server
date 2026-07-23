import type { Types } from 'mongoose';
import type { BlogCommentStatus, BlogPostStatus } from '../enums/blog.enum';
import type { PaginationMeta } from './tour';

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

export interface BlogPostSummaryView {
  authorImageUrl?: string;
  authorName: string;
  category: string;
  excerpt: string;
  id: string;
  imageUrl: string;
  publishedAt: string;
  slug: string;
  title: string;
}

export interface BlogPostView extends BlogPostSummaryView {
  body: unknown;
  updatedAt: string;
}

export interface BlogCommentView {
  body: string;
  createdAt: string;
  id: string;
  memberId?: string;
  name: string;
}

export interface PaginatedBlogPosts {
  data: BlogPostSummaryView[];
  meta: PaginationMeta;
}

export interface PaginatedBlogComments {
  data: BlogCommentView[];
  meta: PaginationMeta;
}

export interface BlogCommentInquiry {
  limit: number;
  page: number;
  postId: Types.ObjectId;
}

export interface BlogPostInput {
  authorImageUrl?: string;
  authorName: string;
  body: unknown;
  category: string;
  excerpt: string;
  imageUrl: string;
  publishedAt?: Date;
  slug: string;
  status: BlogPostStatus;
  title: string;
}

export interface BlogPostUpdateInput extends Partial<BlogPostInput> {
  _id: Types.ObjectId;
}

export interface AdminBlogPostView extends Omit<
  BlogPost,
  '_id' | 'createdAt' | 'publishedAt' | 'updatedAt'
> {
  createdAt: string;
  id: string;
  publishedAt?: string;
  updatedAt: string;
}
