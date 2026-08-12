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
  postId?: Types.ObjectId;
  tourId?: number;
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
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  imageUrl: string;
  authorName: string;
  authorImageUrl?: string;
  commentCount: number;
  publishedAt: string;
}

export interface BlogPostView extends BlogPostSummaryView {
  body: unknown;
  updatedAt: string;
}

export interface BlogCommentView {
  id: string;
  memberId?: string;
  name: string;
  body: string;
  createdAt: string;
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
}

export interface BlogPostWriteInput extends Omit<BlogPostInput, 'imageUrl'> {
  imageUrl?: string;
}

export interface BlogPostUpdateInput extends Partial<BlogPostInput> {
  _id: Types.ObjectId;
}

export interface BlogPostWriteUpdateInput extends Partial<BlogPostWriteInput> {
  _id: Types.ObjectId;
}

export interface AdminBlogPostView extends Omit<
  BlogPost,
  '_id' | 'createdAt' | 'publishedAt' | 'updatedAt'
> {
  id: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBlogPostInquiry {
  limit: number;
  page: number;
  query?: string;
  status?: BlogPostStatus;
}

export interface AdminBlogCommentInquiry {
  limit: number;
  page: number;
  postId?: Types.ObjectId;
  query?: string;
  status?: BlogCommentStatus;
}

export interface AdminBlogCommentView {
  id: string;
  postId?: string;
  tourId?: number;
  memberId?: string;
  name: string;
  email: string;
  body: string;
  status: BlogCommentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedAdminBlogPosts {
  data: AdminBlogPostView[];
  meta: PaginationMeta;
}

export interface PaginatedAdminBlogComments {
  data: AdminBlogCommentView[];
  meta: PaginationMeta;
}
