import 'dotenv/config';
import { z } from 'zod';

const optionalEnvString = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === ''
      ? undefined
      : value,
  z.string().trim().min(1).optional(),
);

const schema = z
  .object({
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    NODE_ENV: z.string().default('development'),

    GEMINI_API_KEY: optionalEnvString,
    GEMINI_MODEL: z.string().trim().min(1).default('gemini-3.8-flash'),

    PAYPAL_CLIENT_ID: optionalEnvString,
    PAYPAL_CLIENT_SECRET: optionalEnvString,
    PAYPAL_BASE_URL: z.string().url().default('https://api-m.sandbox.paypal.com'),

    FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  })
  .superRefine((values, ctx) => {
    if (Boolean(values.PAYPAL_CLIENT_ID) !== Boolean(values.PAYPAL_CLIENT_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['PAYPAL_CLIENT_SECRET'],
        message: 'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be configured together.',
      });
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    '[config] Invalid environment:',
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGIN
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
