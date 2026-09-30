import { z } from 'zod';
import { databaseUrl } from './database.ts';
const schema = z.object({
  DATABASE_URL: z.string().url().refine(value => /^postgres(?:ql)?:/.test(value)),
  SESSION_SECRET: z.string().min(32).max(512),
  APP_ORIGIN: z.string().url().default('http://localhost:5173'),
  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  COOKIE_SAME_SITE: z.enum(['Strict', 'Lax', 'None']).default('Strict'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  REGISTRATION_ENABLED: z.enum(['true', 'false']).default('false'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});
export function readConfig(env: NodeJS.ProcessEnv) {
  const result = schema.safeParse({ ...env, API_PORT: env.PORT ?? env.API_PORT });
  if (!result.success) throw new Error('Invalid server configuration: ' + result.error.issues.map(issue => issue.path.join('.')).join(', '));
  const values = result.data;
  const origin = new URL(values.APP_ORIGIN);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('APP_ORIGIN must be an HTTP(S) origin.');
  const production = values.NODE_ENV === 'production';
  if (production && origin.protocol !== 'https:') throw new Error('APP_ORIGIN requires HTTPS in production.');
  if (origin.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) throw new Error('HTTP is only allowed on loopback.');
  const secureCookies = production || origin.protocol === 'https:';
  if (values.COOKIE_SAME_SITE === 'None' && !secureCookies) throw new Error('SameSite=None requires HTTPS.');
  return { databaseUrl: databaseUrl(env), sessionSecret: values.SESSION_SECRET, origin: origin.origin,
    port: values.API_PORT, host: env.API_HOST ?? (production ? '0.0.0.0' : values.API_HOST), secureCookies,
    sameSite: values.COOKIE_SAME_SITE, trustProxy: values.TRUST_PROXY === 'true', registrationEnabled: values.REGISTRATION_ENABLED === 'true' };
}
export function readBootstrap(env: NodeJS.ProcessEnv) {
  const result = z.object({ ADMIN_BOOTSTRAP_EMAIL: z.string().trim().toLowerCase().email().max(254), ADMIN_BOOTSTRAP_PASSWORD: z.string().min(20).max(256) }).safeParse(env);
  if (!result.success) throw new Error('Configure private ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD (20-256 characters).');
  return { email: result.data.ADMIN_BOOTSTRAP_EMAIL, password: result.data.ADMIN_BOOTSTRAP_PASSWORD };
}
