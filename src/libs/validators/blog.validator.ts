import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Must be a valid ID.');

export const blogPostListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(9),
    category: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const blogPostSlugParamsSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a URL-safe slug.'),
  })
  .strict();

export const blogPostIdParamsSchema = z.object({ id: objectId }).strict();

export const blogCommentListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const blogCommentBodySchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    email: z.string().trim().toLowerCase().email().max(254),
    body: z.string().trim().min(2).max(5_000),
  })
  .strict();
