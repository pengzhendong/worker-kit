import { admin, hubEnv, hubRequest } from '../utils/admin';
export default defineEventHandler(async event => {
 const request = hubRequest(event), path = new URL(request.url).pathname.replace(/^\/hub(?=\/)/, '');
 if (!path.startsWith('/api/') || path.startsWith('/api/admin/')) return;
 setResponseHeader(event, 'Cache-Control', 'no-store');
 if (!await admin.isAuthenticated(request, hubEnv(event))) throw createError({ statusCode: 401, message: '请先登录' });
 if (!['GET','HEAD'].includes(request.method) && request.headers.get('origin') !== new URL(request.url).origin) throw createError({ statusCode: 403, message: '请求来源不符' });
});
