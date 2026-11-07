import { betterAuth } from 'better-auth';
import { admin, username } from 'better-auth/plugins';

export function authOptions(
  env: { AUTH_DB: D1Database; STANDARD_AUTH_SECRET?: string },
  origin: string,
) {
  if (!env.STANDARD_AUTH_SECRET || env.STANDARD_AUTH_SECRET.length < 32)
    throw Error('Authentication secret is not configured');
  return {
    appName: 'WorkerKit',
    baseURL: origin,
    basePath: '/standard/auth',
    secret: env.STANDARD_AUTH_SECRET,
    database: env.AUTH_DB,
    emailAndPassword: { enabled: true, disableSignUp: true },
    session: { expiresIn: 12 * 60 * 60 },
    trustedOrigins: [origin],
    advanced: {
      cookiePrefix: 'workerkit_standard',
      defaultCookieAttributes: {
        path: '/',
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: origin.startsWith('https:'),
      },
    },
    plugins: [username(), admin()],
  } satisfies Parameters<typeof betterAuth>[0];
}
export const createAuth = (
  env: Parameters<typeof authOptions>[0],
  origin: string,
) => betterAuth(authOptions(env, origin));
