import { z } from 'zod';

const idempotencyKey = z
  .string()
  .trim()
  .min(16)
  .max(255)
  .regex(
    /^[A-Za-z0-9._:-]+$/,
    'Use only letters, numbers, periods, underscores, colons, and hyphens.',
  );

export const paymentIntentBodySchema = z
  .object({
    bookingId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Must be a valid booking ID.'),
  })
  .strict();

export const paymentIntentHeadersSchema = z
  .object({
    'idempotency-key': idempotencyKey,
  })
  .passthrough();

export const stripeWebhookHeadersSchema = z
  .object({
    'stripe-signature': z.string().min(1).max(2_048),
  })
  .passthrough();
