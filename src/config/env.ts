import 'dotenv/config';
import { z } from 'zod';

const developmentSessionPepper = 'cavora-development-session-pepper-change-in-production';
const developmentCsrfSecret = 'cavora-development-csrf-secret-change-in-production';
const developmentStripeSecretKey = 'sk_test_replace_me';
const developmentStripeWebhookSecret = 'whsec_replace_me';

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
    STRIPE_SECRET_KEY: z
      .string()
      .regex(/^(?:sk|rk)_(?:test|live)_/, 'Must be a Stripe secret or restricted key.')
      .default(developmentStripeSecretKey),
    STRIPE_WEBHOOK_SECRET: z
      .string()
      .regex(/^whsec_/, 'Must be a Stripe webhook signing secret.')
      .default(developmentStripeWebhookSecret),
  })
  .superRefine((value, context) => {
    if (value.SESSION_COOKIE_NAME === value.CSRF_COOKIE_NAME) {
      context.addIssue({
        code: 'custom',
        path: ['CSRF_COOKIE_NAME'],
        message: 'Session and CSRF cookies must use different names.',
      });
    }
    if (value.SESSION_TOKEN_PEPPER === value.CSRF_SECRET) {
      context.addIssue({
        code: 'custom',
        path: ['CSRF_SECRET'],
        message: 'The CSRF secret must be different from the session token pepper.',
      });
    }

    if (value.NODE_ENV !== 'production') return;

    if (new URL(value.FRONTEND_ORIGIN).protocol !== 'https:') {
      context.addIssue({
        code: 'custom',
        path: ['FRONTEND_ORIGIN'],
        message: 'Production requires an HTTPS frontend origin.',
      });
    }
    for (const key of ['EMAIL_VERIFICATION_URL', 'PASSWORD_RESET_URL'] as const) {
      const url = value[key];
      if (url && new URL(url).protocol !== 'https:') {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'Production account links must use HTTPS.',
        });
      }
    }
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
    if (value.STRIPE_SECRET_KEY === developmentStripeSecretKey) {
      context.addIssue({
        code: 'custom',
        path: ['STRIPE_SECRET_KEY'],
        message: 'Production requires a real Stripe secret key.',
      });
    }
    if (value.STRIPE_WEBHOOK_SECRET === developmentStripeWebhookSecret) {
      context.addIssue({
        code: 'custom',
        path: ['STRIPE_WEBHOOK_SECRET'],
        message: 'Production requires a real Stripe webhook secret.',
      });
    }
  });

export function validateEnvironment(input: NodeJS.ProcessEnv) {
  const parsedEnv = envSchema.safeParse(input);

  if (!parsedEnv.success) {
    const details = parsedEnv.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return Object.freeze({
    ...parsedEnv.data,
    EMAIL_VERIFICATION_URL:
      parsedEnv.data.EMAIL_VERIFICATION_URL ??
      `${parsedEnv.data.FRONTEND_ORIGIN.replace(/\/$/, '')}/verify-email`,
    PASSWORD_RESET_URL:
      parsedEnv.data.PASSWORD_RESET_URL ??
      `${parsedEnv.data.FRONTEND_ORIGIN.replace(/\/$/, '')}/reset-password`,
  });
}

export const env = validateEnvironment(process.env);
export type Environment = typeof env;
