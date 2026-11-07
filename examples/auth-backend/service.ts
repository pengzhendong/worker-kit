import { DurableObject } from 'cloudflare:workers';
import { createAuth } from './auth';
import type { StandardBindings } from './worker';

/** Better Auth owns credentials, hashing, cookies, users and sessions.
 * A SQLite DO gives password hashing the documented DO CPU budget while the
 * public Worker only forwards requests. This is one Worker with a native DO.
 */
export class WorkerKitAuthService extends DurableObject<StandardBindings> {
  private initialized = false;
  async fetch(request: Request) {
    const origin = new URL(request.url).origin;
    if (!this.initialized) {
      await this.ctx.blockConcurrencyWhile(async () => {
        const existing = await this.env.AUTH_DB.prepare(
          'SELECT id FROM "user" LIMIT 1',
        ).first();
        if (!existing) {
          if (!this.env.STANDARD_ADMIN_PASSWORD)
            throw Error('Initial administrator is not configured');
          const auth = createAuth(this.env, origin);
          // Better Auth permits this privileged server API without request headers;
          // its public HTTP endpoint still requires an authenticated administrator.
          await auth.api.createUser({
            body: {
              email: 'admin@workerkit.example',
              name: 'admin',
              password: this.env.STANDARD_ADMIN_PASSWORD,
              role: 'admin',
              data: { username: 'admin', displayUsername: 'admin' },
            },
          });
        }
        this.initialized = true;
      });
    }
    return createAuth(this.env, origin).handler(request);
  }
}
