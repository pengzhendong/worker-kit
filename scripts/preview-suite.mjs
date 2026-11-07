import http from 'node:http';
import { stat, readFile, realpath } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
if (!process.argv.includes('--no-build')) {
  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'demo:build'], { cwd: root, stdio: 'inherit' });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error('Suite build failed')));
  });
}
const directory = await realpath(path.join(root, 'dist/ui-suite'));
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.ico': 'image/x-icon' };
const server = http.createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); return response.end(); }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const mount = pathname.split('/')[1];
    if (['nuxt', 'prime', 'element', 'naive', 'shadcn', 'vuetify', 'quasar', 'mui', 'mantine', 'pure', 'soybean', 'vben', 'pro', 'refine', 'tabler', 'adminlte', 'docs'].includes(mount) && pathname === `/${mount}`) { response.writeHead(302, { Location: `/${mount}/` }); return response.end(); }
    let file = path.resolve(directory, `.${pathname}`);
    if (!file.startsWith(`${directory}/`) && file !== directory) { response.writeHead(403); return response.end(); }
    try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html'); }
    catch {
      if (['nuxt', 'prime', 'element', 'naive', 'shadcn', 'vuetify', 'quasar', 'mui', 'mantine', 'pure', 'soybean', 'vben', 'pro', 'refine', 'tabler', 'adminlte'].includes(mount) && !path.extname(pathname)) file = path.join(directory, mount, 'index.html');
      else if (mount === 'docs' && !path.extname(pathname)) file += '.html';
      else { response.writeHead(404); return response.end('Not found'); }
    }
    const resolved = await realpath(file);
    if (!resolved.startsWith(`${directory}/`)) { response.writeHead(403); return response.end(); }
    const data = await readFile(resolved);
    const headers = { 'Content-Type': contentTypes[path.extname(resolved)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' };
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]); const end = range[2] ? Math.min(Number(range[2]), data.length - 1) : data.length - 1;
      if (start > end || start >= data.length) { response.writeHead(416, { 'Content-Range': `bytes */${data.length}` }); return response.end(); }
      response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes' });
      return response.end(request.method === 'HEAD' ? undefined : data.subarray(start, end + 1));
    }
    response.writeHead(200, { ...headers, 'Content-Length': data.length, 'Accept-Ranges': 'bytes' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
const port = Number(process.env.WORKERKIT_SUITE_PORT || 5190);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid preview port');
server.listen(port, '127.0.0.1', () => console.log(`WorkerKit preview suite: http://localhost:${port}`));
