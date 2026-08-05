import { z } from 'zod';
import { objectId } from './common.validator';

export const bookingHoldBodySchema = z
  .object({
    tourId: z.number().int().positive(),
    departureId: objectId('departure ID'),
    travelers: z.number().int().min(1).max(50),
  })
  .strict();

export const bookingIdParamsSchema = z
  .object({
    id: objectId('booking ID'),
  })
  .strict();
