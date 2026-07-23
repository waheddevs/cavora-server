import { z } from 'zod';

export const bookingHoldBodySchema = z
  .object({
    tourId: z.number().int().positive(),
    departureId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Must be a valid departure ID.'),
    travelers: z.number().int().min(1).max(50),
  })
  .strict();

export const bookingIdParamsSchema = z
  .object({
    id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Must be a valid booking ID.'),
  })
  .strict();
