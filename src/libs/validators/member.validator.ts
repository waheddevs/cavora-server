import { z } from 'zod';
import { BookingStatus } from '../enums/booking.enum';

const email = z.string().trim().toLowerCase().email().max(254);
const username = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .regex(/^[A-Za-z0-9_]+$/, 'Only letters, numbers, and underscores are allowed.');
const password = z.string().min(8).max(128);
const accountToken = z.string().min(40).max(200);
const avatarUrl = z.union([
  z.string().trim().url().max(2_048),
  z
    .string()
    .trim()
    .regex(/^\/(?!\/)/, 'Must be an absolute URL or a local absolute path.')
    .max(2_048),
  z.literal(''),
]);

export const registerBodySchema = z
  .object({
    email,
    username,
    password,
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
  })
  .strict();

export const adminRegisterBodySchema = registerBodySchema;

export const loginBodySchema = z
  .object({
    email,
    password: z.string().min(1).max(128),
  })
  .strict();

export const forgotPasswordBodySchema = z.object({ email }).strict();

export const resetPasswordBodySchema = z
  .object({
    token: accountToken,
    password,
  })
  .strict();

export const verifyEmailBodySchema = z.object({ token: accountToken }).strict();

export const profileUpdateBodySchema = z
  .object({
    email: email.optional(),
    username: username.optional(),
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().max(30).optional(),
    location: z.string().trim().max(160).optional(),
    avatarUrl: avatarUrl.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one profile field is required.',
  });

export const passwordChangeBodySchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: password,
  })
  .strict()
  .refine((input) => input.currentPassword !== input.newPassword, {
    message: 'The new password must be different from the current password.',
    path: ['newPassword'],
  });

export const wishlistTourParamsSchema = z
  .object({
    tourId: z.coerce.number().int().positive(),
  })
  .strict();

export const bookingHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(BookingStatus).optional(),
  })
  .strict();
