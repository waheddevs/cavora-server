import { z } from 'zod';
import { paginationFields } from './common.validator';

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must use YYYY-MM-DD format.')
  .transform((value) => new Date(`${value}T00:00:00.000Z`))
  .refine((value) => !Number.isNaN(value.getTime()), 'Must be a valid date.');

export const tourIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const tourViewBodySchema = z
  .object({
    visitorId: z.uuid(),
  })
  .strict();

export const tourListQuerySchema = z
  .object({
    query: z.string().trim().min(1).max(120).optional(),
    destination: z.string().trim().min(1).max(120).optional(),
    type: z.string().trim().min(1).max(80).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    duration: z.enum(['short', 'medium', 'long']).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    sort: z
      .enum(['price-asc', 'price-desc', 'rating', 'duration', 'popularity'])
      .default('popularity'),
    ...paginationFields(9, 50),
  })
  .strict()
  .superRefine((query, context) => {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      context.addIssue({
        code: 'custom',
        path: ['maxPrice'],
        message: 'maxPrice must be greater than or equal to minPrice.',
      });
    }
  });

export const availabilityQuerySchema = z
  .object({
    travelers: z.coerce.number().int().min(1).max(50).default(1),
    from: optionalDate.optional(),
    to: optionalDate.optional(),
  })
  .strict()
  .superRefine((query, context) => {
    if (query.from && query.to && query.from > query.to) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'to must be on or after from.',
      });
    }
  });
