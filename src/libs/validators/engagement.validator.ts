import { z } from 'zod';
import { NewsletterSource } from '../enums/engagement.enum';

export const contactMessageBodySchema = z
  .object({
    fullName: z.string().trim().min(1).max(160),
    email: z.string().trim().toLowerCase().email().max(254),
    phone: z.string().trim().min(3).max(30).optional(),
    subject: z.string().trim().min(2).max(240),
    message: z.string().trim().min(10).max(10_000),
  })
  .strict();

export const newsletterSubscriptionBodySchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    source: z.enum(NewsletterSource),
  })
  .strict();
