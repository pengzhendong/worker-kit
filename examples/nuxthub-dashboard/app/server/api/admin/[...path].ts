import { Hono } from 'hono';
import { admin, hubEnv, hubRequest, type HubEnv } from '../../utils/admin';
const app = new Hono<{ Bindings: HubEnv }>().route('/api/admin', admin.routes);
export default defineEventHandler(event => {
 const original = hubRequest(event), url = new URL(original.url); url.pathname = url.pathname.replace(/^\/hub(?=\/)/, '');
 return app.fetch(new Request(url, original), hubEnv(event));
});
