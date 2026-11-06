import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { createNativeAdmin } from '../src/server/native-admin';
type Bindings = { store: KVNamespace; password: string; allow: boolean };
function fixture(origin = 'https://native.test') {
 const bindings = { store: (env as unknown as { SETTINGS: KVNamespace }).SETTINGS, password: 'test-password', allow: true };
 const native = createNativeAdmin<Bindings>({ store: e => e.store, username: () => 'admin', password: e => e.password, rateLimit: async e => e.allow, prefix: 'test:' + crypto.randomUUID() + ':', cookieName: 'test_native', apiRoot: '/api', settings: { title: 'demo' }, runtime: () => ({ application: { name: 'test', version: '1' }, environment: 'test', checks: [] }) });
 const fetch = (path: string, init?: RequestInit) => native.routes.fetch(new Request(origin + path, init), bindings);
 return { bindings, fetch, origin };
}
async function login(f: ReturnType<typeof fixture>) { const r=await f.fetch('/auth/login',{method:'POST',headers:{Origin:f.origin,'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'test-password'})});expect(r.status).toBe(200);return r.headers.get('Set-Cookie')!.split(';')[0]!; }
describe('native management composition on workerd KV', () => {
 it('fails closed, checks login origin, wrong password and rate limiter', async () => {
  const f=fixture();expect((await f.fetch('/settings')).status).toBe(401);
  expect((await f.fetch('/auth/login',{method:'POST',body:'{}'})).status).toBe(403);
  expect((await f.fetch('/auth/login',{method:'POST',headers:{Origin:f.origin},body:JSON.stringify({username:'admin',password:'wrong'})})).status).toBe(401);
  f.bindings.allow=false;expect((await f.fetch('/auth/login',{method:'POST',headers:{Origin:f.origin},body:'{}'})).status).toBe(429);
  f.bindings.password='';expect((await f.fetch('/settings')).status).toBe(503);
 });
 it('allows declared settings only and records actions without settings values', async () => {
  const f=fixture(),cookie=await login(f),headers={cookie,Origin:f.origin,'Content-Type':'application/json'};
  expect((await f.fetch('/settings',{method:'PUT',headers:{...headers,Origin:'https://evil.test'},body:'{}'})).status).toBe(403);
  expect((await f.fetch('/settings',{method:'PUT',headers,body:JSON.stringify({values:{password:'do-not-store'}})})).status).toBe(400);
  expect((await f.fetch('/settings',{method:'PUT',headers,body:JSON.stringify({values:{title:'private-setting-value'}})})).status).toBe(200);
  expect((await (await f.fetch('/settings',{headers})).json() as any).values.title).toBe('private-setting-value');
  const audit=await (await f.fetch('/audit',{headers})).text();expect(audit).toContain('settings.update');expect(audit).not.toContain('private-setting-value');
 });
 it('separates scoped keys from sessions, revokes keys, and never returns hashes or complete tokens again', async () => {
  const f=fixture(),cookie=await login(f),headers={cookie,Origin:f.origin,'Content-Type':'application/json'};
  const issued=await (await f.fetch('/keys',{method:'POST',headers,body:JSON.stringify({name:'test',permissions:['runtime:read'],expiresInDays:1})})).json() as any;
  expect(issued.token).toMatch(/^wk_/);const tokenHeaders={Authorization:'Bearer '+issued.token};
  expect((await f.fetch('/service-status',{headers:tokenHeaders})).status).toBe(200);
  expect((await f.fetch('/settings',{headers:tokenHeaders})).status).toBe(401);
  const list=await (await f.fetch('/keys',{headers})).text();expect(list).not.toContain(issued.token);expect(list).not.toContain('hash');
  expect((await f.fetch('/keys/'+issued.key.id,{method:'DELETE',headers})).status).toBe(200);
  expect((await f.fetch('/service-status',{headers:tokenHeaders})).status).toBe(401);
  expect((await (await f.fetch('/audit',{headers})).text())).not.toContain(issued.token);
  await f.fetch('/auth/logout',{method:'POST',headers});expect((await f.fetch('/auth/session',{headers})).status).toBe(401);
 });
 it('permits loopback subdomains without allowing insecure public domains', async () => {
  const f=fixture('http://kit.localhost');const cookie=await login(f);expect((await f.fetch('/auth/session',{headers:{cookie}})).status).toBe(200);
  const publicHost=fixture('http://kit.localhost.evil.test');expect((await publicHost.fetch('/auth/session',{headers:{cookie}})).status).toBe(401);
 });
});
