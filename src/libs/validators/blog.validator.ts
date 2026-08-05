import { z } from 'zod';
import { objectId, paginationFields, slug } from './common.validator';

export const blogPostListQuerySchema = z
  .object({
    ...paginationFields(9, 50),
    category: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const blogPostSlugParamsSchema = z
  .object({
    slug,
  })
  .strict();

export const blogPostIdParamsSchema = z.object({ id: objectId() }).strict();

export const blogCommentListQuerySchema = z
  .object({
    ...paginationFields(20, 100),
  })
  .strict();

export const blogCommentBodySchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    email: z.string().trim().toLowerCase().email().max(254),
    body: z.string().trim().min(2).max(5_000),
  })
  .strict();
