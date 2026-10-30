import {env} from 'cloudflare:test';
import {beforeEach, expect, it} from 'vitest';
import {createServer} from '../src/server/app';
import {createAdminAuth} from '../src/server/auth';
import {d1AdminPasswordStore} from '../src/server/password-store';
const origin='https://example.com';
const bindings={...env,ADMIN_USERNAME:'owner',ADMIN_PASSWORD:'original-password',ADMIN_SESSION_SECRET:'test-session-secret-at-least-32-characters',ADMIN_LOGIN_RATE_LIMITER:{limit:async()=>({success:true})}};
const app=createServer<typeof bindings>({log:()=>{}});
const auth=createAdminAuth<typeof bindings>({passwordStore:e=>d1AdminPasswordStore(e.DB)});app.route('/auth',auth.routes);
const send=(path:string,body?:unknown,cookie='',source=origin)=>app.request(origin+'/auth/'+path,{method:body?'POST':'GET',headers:{Origin:source,'Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})},bindings);
beforeEach(async()=>{await env.DB.exec('CREATE TABLE IF NOT EXISTS workerkit_admin_passwords(id TEXT PRIMARY KEY,password_hash TEXT NOT NULL); DELETE FROM workerkit_admin_passwords;');});
it('requires the old password, persists only a salted hash, invalidates every old cookie and never falls back to the bootstrap password',async()=>{
 const a=await send('login',{username:'owner',password:'original-password'});const cookie=a.headers.get('set-cookie')!.split(';')[0];
 const b=await send('login',{username:'owner',password:'original-password'});const other=b.headers.get('set-cookie')!.split(';')[0];
 expect((await send('password',{currentPassword:'wrong',newPassword:'new-valid-password'},cookie)).status).toBe(422);
 expect((await send('password',{currentPassword:'original-password',newPassword:'short'},cookie)).status).toBe(422);
 expect((await send('password',{currentPassword:'original-password',newPassword:'new-valid-password'},cookie,'https://evil.test')).status).toBe(403);
 expect((await send('password',{currentPassword:'original-password',newPassword:'new-valid-password'},cookie)).status).toBe(204);
 expect((await send('session',undefined,cookie)).status).toBe(401);expect((await send('session',undefined,other)).status).toBe(401);
 expect((await send('login',{username:'owner',password:'original-password'})).status).toBe(401);
 expect((await send('login',{username:'owner',password:'new-valid-password'})).status).toBe(200);
 const row=await env.DB.prepare('SELECT password_hash FROM workerkit_admin_passwords').first<{password_hash:string}>();expect(row!.password_hash).toMatch(/^pbkdf2-sha256\$100000\$/);expect(row!.password_hash).not.toContain('new-valid-password');
});
it('compare-and-set rejects stale updates; missing storage fails closed',async()=>{
 const store=d1AdminPasswordStore(env.DB);expect(await store.replace(null,'first')).toBe(true);expect(await store.replace(null,'overwrite')).toBe(false);expect(await store.replace('stale','overwrite')).toBe(false);expect(await store.read()).toBe('first');
 const broken=createServer<typeof bindings>({log:()=>{}});broken.route('/auth',createAdminAuth<typeof bindings>({passwordStore:()=>({read:async()=>{throw Error('offline');},replace:async()=>false})}).routes);expect((await broken.request(origin+'/auth/session',{},bindings)).status).toBe(500);
});
