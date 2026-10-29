import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/ai_mystery_room'),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  GEMINI_FALLBACK_MODEL: z.string().default('gemini-3.5-flash-lite'),
  SESSION_SECRET: z.string().default('development-only-change-this-session-secret'),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(24),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().positive().default(90000),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(3).default(2)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
export const env = parsed.data;
if (env.NODE_ENV === 'production' && env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters in production.');
}
