import { createAdminAuth, createServer, requireSameOrigin } from '@pengzhendong/worker-kit/server';
import type { AdminBindings } from '@pengzhendong/worker-kit/server';

// Business code owns routes and explicitly chooses which ones require a session.
const app = createServer<AdminBindings>();
const auth = createAdminAuth<AdminBindings>();
app.get('/health', (c) => c.json({ ok: true, service: 'worker-kit-dashboard' }));
app.route('/api/auth', auth.routes);
app.use('/api/admin/*', auth.requireAdmin);
app.get('/api/admin/overview', (c) => c.json({
  user: c.get('adminUser'),
  runtime: 'Cloudflare Workers',
  message: '这个接口属于示例业务，共享库不包含它。',
  now: new Date().toISOString(),
}));
app.post('/api/admin/echo', (c) => {
  requireSameOrigin(c.req.raw);
  return c.json({ ok: true });
});
export default app;
