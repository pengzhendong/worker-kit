import { env } from 'cloudflare:workers';
import { frameworkUser } from '../../../fullstack-shared/backend';
export const load = async ({ request, platform, setHeaders }) => {
  setHeaders({ 'Cache-Control': 'no-store' });
  const user = await frameworkUser(request, env);
  return {
    user: user?.username || user?.name || null,
    renderedAt: new Date().toISOString(),
  };
};
