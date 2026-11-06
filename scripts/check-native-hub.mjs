import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { chromium, expect, request } from '@playwright/test';
const base=process.env.WORKERKIT_URL || 'http://kit.localhost:5184';
const origin=new URL(base).origin;
assert(process.env.WORKERKIT_DEPLOYED==='1' || ['localhost','127.0.0.1'].includes(new URL(base).hostname) || new URL(base).hostname.endsWith('.localhost'),'Use an explicitly authorized deployment for remote writes');
const headers={Origin:origin};const guest=await request.newContext();
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(60000);
const errors=[],foreign=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!==origin)foreign.push(r.url());});
const convergence=process.env.WORKERKIT_DEPLOYED==='1'?{timeout:90000,intervals:[1000,3000,5000]}:{};
const api=context.request;let previous,issuedId,noteId,filePath,oldLabel;const unique='QA-'+randomUUID().slice(0,8);
await mkdir('test-results/native-hub',{recursive:true});
try {
 console.log('Checking anonymous boundaries');
 for(const path of ['/native/api/settings','/native/api/keys','/hub/api/probe'])assert.equal((await guest.get(base+path)).status(),401);
 assert.equal((await guest.post(base+'/native/api/auth/login',{data:{username:'admin',password:'password'}})).status(),403);
 await page.goto(base+'/native/');await page.getByLabel('用户名',{exact:true}).fill('admin');await page.getByLabel('密码',{exact:true}).fill('password');await page.getByRole('button',{name:'登录',exact:true}).click();
 await expect(page.getByText('依赖正常',{exact:true})).toBeVisible();
 // Long content scrolls independently of the sidebar/header.
 await page.setViewportSize({width:1440,height:600});const content=page.locator('[data-content-scroll]');const header=page.getByRole('heading',{name:'WorkerKit',exact:true});const before=await header.boundingBox();await content.evaluate(el=>{el.scrollTop=el.scrollHeight});assert.ok(await content.evaluate(el=>el.scrollTop>0));assert.equal(Math.round((await header.boundingBox()).y),Math.round(before.y));
 await page.getByRole('link',{name:'KV 设置',exact:true}).click();await expect(page.getByLabel('站点名称',{exact:true})).toBeVisible();await expect.poll(()=>content.evaluate(el=>el.scrollTop)).toBe(0);
 previous=await (await api.get(base+'/native/api/settings')).json();await page.getByLabel('站点名称',{exact:true}).fill(unique);await page.getByRole('button',{name:'保存设置',exact:true}).click();await expect.poll(async()=>(await(await api.get(base+'/native/api/settings')).json()).values.siteTitle,convergence).toBe(unique);
 await page.setViewportSize({width:1440,height:1000});await page.getByRole('link',{name:'访问密钥',exact:true}).click();await page.getByLabel('名称',{exact:true}).fill(unique);const issued=page.waitForResponse(r=>r.url()===base+'/native/api/keys'&&r.request().method()==='POST');await page.getByRole('button',{name:'签发密钥',exact:true}).click();issuedId=(await(await issued).json()).key.id;await expect(page.locator('[data-issued-token]')).toBeVisible();const token=await page.locator('[data-issued-token]').innerText();
 await expect.poll(async()=>{const page=await(await api.get(base+'/native/api/keys')).json();return page.items.some(k=>k.name===unique);},convergence).toBe(true);const keys=await(await api.get(base+'/native/api/keys')).json();issuedId=keys.items.find(k=>k.name===unique).id;assert.equal(JSON.stringify(keys).includes(token),false);assert.equal(await page.evaluate(value=>JSON.stringify({...localStorage,...sessionStorage}).includes(value),token),false);
 await expect.poll(async()=>(await guest.get(base+'/native/api/service-status',{headers:{Authorization:'Bearer '+token}})).status(),convergence).toBe(200);assert.equal((await guest.get(base+'/native/api/settings',{headers:{Authorization:'Bearer '+token}})).status(),401);
 await page.getByRole('button',{name:'已保存，关闭',exact:true}).click();await expect(page.locator('[data-issued-token]')).toHaveCount(0);
 const row=page.getByRole('row').filter({hasText:unique});await row.getByRole('button',{name:'撤销',exact:true}).click();await page.getByRole('button',{name:'确认撤销',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect.poll(async()=>(await guest.get(base+'/native/api/service-status',{headers:{Authorization:'Bearer '+token}})).status(),convergence).toBe(401);
 await expect.poll(async()=>(await(await api.get(base+'/native/api/audit')).json()).items.some(item=>item.action==='key.revoke'&&item.target===issuedId),convergence).toBe(true);await page.getByRole('link',{name:'操作审计',exact:true}).click();await expect(page.getByText('key.revoke',{exact:true}).first()).toBeVisible();assert.equal((await page.locator('body').innerText()).includes(token),false);
 await page.getByRole('link',{name:'API 中心',exact:true}).first().click();await page.getByRole('textbox',{name:'搜索接口',exact:true}).fill('运行检查');await page.getByRole('button',{name:'查看 运行检查',exact:true}).click();const docs=page.frameLocator('iframe[title="交互式 API 文档"]');await expect(docs.getByText('运行检查',{exact:true}).first()).toBeVisible({timeout:30000});
 await docs.getByRole('button',{name:/GET .*runtime 运行检查/}).click();await docs.getByRole('button',{name:/^测试请求/}).click();
 const [response]=await Promise.all([page.waitForResponse(r=>r.url()===base+'/native/api/runtime'&&r.request().method()==='GET'),docs.getByRole('button',{name:/向 .*runtime 发送 get 请求/}).click()]);assert.equal(response.status(),200);await docs.getByRole('button',{name:'关闭客户端',exact:true}).click();
 await page.screenshot({path:'test-results/native-hub/native-api.png',animations:'disabled'});
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/native/#/runtime');await expect(page.getByRole('heading',{name:'运行状态',exact:true})).toBeVisible();await page.locator('[data-slot="toggle"]').click();await page.getByRole('link',{name:'服务配置',exact:true}).click();await expect(page.getByRole('heading',{name:'服务配置',exact:true})).toBeVisible();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'test-results/native-hub/native-mobile.png',animations:'disabled'});
 assert.equal((await api.post(base+'/native/api/auth/logout',{headers})).status(),200);await expect.poll(async()=>(await api.get(base+'/native/api/auth/session')).status(),convergence).toBe(401);await page.getByRole('button',{name:'刷新配置',exact:true}).click();await expect(page.getByRole('button',{name:'登录',exact:true})).toBeVisible();
 console.log('Native UI checks passed');
 // Independent NuxtHub identity and its actual SQL/KV/Blob/Cache SDKs.
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/hub/');await page.getByLabel('用户名',{exact:true}).fill('admin');await page.getByLabel('密码',{exact:true}).fill('password');await page.getByRole('button',{name:'登录',exact:true}).click();await expect(page.getByRole('heading',{name:'NuxtHub 全栈工作台',exact:true})).toBeVisible();
 assert.equal((await api.get(base+'/native/api/settings')).status(),401);
 const initial=await(await api.get(base+'/hub/api/probe')).json();oldLabel=initial.label;const cache=initial.cache.generatedAt;assert.equal((await(await api.get(base+'/hub/api/probe')).json()).cache.generatedAt,cache);
 assert.equal((await api.post(base+'/hub/api/notes',{headers:{Origin:'https://untrusted.test'},data:{title:unique}})).status(),403);
 assert.equal((await api.post(base+'/hub/api/notes',{headers,data:'x'.repeat(17000)})).status(),413);
 console.log('Hub session and request guards passed');
 const note=await api.post(base+'/hub/api/notes',{headers,data:{title:unique}});assert.equal(note.status(),200);noteId=(await note.json()).id;
 assert.equal((await api.put(base+'/hub/api/label',{headers,data:{label:unique}})).status(),200);
 const file=await api.post(base+'/hub/api/files',{headers,data:{text:'Synthetic workbench fixture'}});assert.equal(file.status(),200);filePath=(await file.json()).pathname;
 await expect.poll(async()=>(await(await api.get(base+'/hub/api/probe')).json()).label,convergence).toBe(unique);const data=await(await api.get(base+'/hub/api/probe')).json();assert.ok(data.notes.some(n=>n.id===noteId));assert.equal(data.label,unique);assert.ok(data.files.some(f=>f.pathname===filePath));assert.ok(data.cache.generatedAt);
 await page.getByRole('button',{name:'刷新',exact:true}).click();await expect(page.getByText(unique,{exact:true}).first()).toBeVisible();await page.screenshot({path:'test-results/native-hub/hub-desktop.png',animations:'disabled'});
 await page.setViewportSize({width:390,height:844});await expect(page.getByRole('heading',{name:'NuxtHub 全栈工作台',exact:true})).toBeVisible();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'test-results/native-hub/hub-mobile.png',animations:'disabled'});
 let release,blocked=false;const held=new Promise(resolve=>{release=resolve});
 await page.route('**/hub/api/probe',async route=>{blocked=true;await held;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)}).catch(()=>{});},{times:1});
 await page.getByRole('button',{name:'刷新',exact:true}).click();await expect.poll(()=>blocked).toBe(true);
 await page.getByRole('button',{name:'退出登录',exact:true}).click();await expect(page.getByRole('button',{name:'登录',exact:true})).toBeVisible();release();
 await expect(page.getByRole('heading',{name:'NuxtHub 全栈工作台',exact:true})).toHaveCount(0);await expect.poll(async()=>(await api.get(base+'/hub/api/probe')).status(),convergence).toBe(401);
 assert.deepEqual(errors,[]);assert.deepEqual(foreign,[]);
 console.log('PASS native + NuxtHub: native UI auth/settings/keys/audit/docs/scroll/mobile, independent identities, real SQL/KV/R2/cache, origin checks and logout');
} finally {
 try {
  if(previous){await api.post(base+'/native/api/auth/login',{headers,data:{username:'admin',password:'password'}});await api.put(base+'/native/api/settings',{headers,data:previous});if(issuedId)await api.delete(base+'/native/api/keys/'+issuedId,{headers});}
  if(noteId||filePath||oldLabel!==undefined){await api.post(base+'/hub/api/admin/auth/login',{headers,data:{username:'admin',password:'password'}});if(noteId)await api.delete(base+'/hub/api/notes',{headers,data:{id:noteId}});if(filePath)await api.delete(base+'/hub/api/files',{headers,data:{pathname:filePath}});if(oldLabel!==undefined)await api.put(base+'/hub/api/label',{headers,data:{label:oldLabel}});}
 }finally{await browser.close();await guest.dispose();}
}
