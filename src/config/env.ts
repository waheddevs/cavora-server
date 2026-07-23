import 'dotenv/config';
import { z } from 'zod';

const developmentSessionPepper = 'cavora-development-session-pepper-change-in-production';
const developmentCsrfSecret = 'cavora-development-csrf-secret-change-in-production';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3008),
    SERVER_HOST: z.string().min(1).default('0.0.0.0'),
    MONGO_URL: z
      .string()
      .min(1)
      .refine((value) => /^mongodb(?:\+srv)?:\/\//.test(value), 'Must be a valid MongoDB URL.'),
    FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
    SESSION_COOKIE_NAME: z.string().min(1).default('cavora_session'),
    CSRF_COOKIE_NAME: z.string().min(1).default('cavora_csrf'),
    SESSION_TTL_HOURS: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 30)
      .default(24),
    SESSION_TOKEN_PEPPER: z.string().min(32).default(developmentSessionPepper),
    CSRF_SECRET: z.string().min(32).default(developmentCsrfSecret),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    EMAIL_VERIFICATION_URL: z.string().url().optional(),
    PASSWORD_RESET_URL: z.string().url().optional(),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== 'production') return;

    if (value.SESSION_TOKEN_PEPPER === developmentSessionPepper) {
      context.addIssue({
        code: 'custom',
        path: ['SESSION_TOKEN_PEPPER'],
        message: 'Production requires a unique session token pepper.',
      });
    }
    if (value.CSRF_SECRET === developmentCsrfSecret) {
      context.addIssue({
        code: 'custom',
        path: ['CSRF_SECRET'],
        message: 'Production requires a unique CSRF secret.',
      });
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
    .join('; ');

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = Object.freeze({
  ...parsedEnv.data,
  EMAIL_VERIFICATION_URL:
    parsedEnv.data.EMAIL_VERIFICATION_URL ??
    `${parsedEnv.data.FRONTEND_ORIGIN.replace(/\/$/, '')}/verify-email`,
  PASSWORD_RESET_URL:
    parsedEnv.data.PASSWORD_RESET_URL ??
    `${parsedEnv.data.FRONTEND_ORIGIN.replace(/\/$/, '')}/reset-password`,
});
export type Environment = typeof env;
