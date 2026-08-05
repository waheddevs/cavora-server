import { z } from 'zod';

export function objectId(label = 'ID') {
  return z.string().regex(/^[a-fA-F0-9]{24}$/, `Must be a valid ${label}.`);
}

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a URL-safe slug.');

export function localOrRemoteUrl(message = 'Must be a URL or local absolute path.') {
  return z.union([
    z.string().trim().url().max(2_048),
    z
      .string()
      .trim()
      .regex(/^\/(?!\/)/, message)
      .max(2_048),
  ]);
}

export function paginationFields(defaultLimit: number, maximumLimit: number) {
  return {
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(maximumLimit).default(defaultLimit),
  };
}
