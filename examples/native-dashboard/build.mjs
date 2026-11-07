import { build } from 'vite';
import { cp, mkdir, writeFile } from 'node:fs/promises';
await build();
await build({ configFile: false, define: { 'process.env.NODE_ENV': JSON.stringify('production') }, build: { target: 'es2022', outDir: 'dist/native/assets', emptyOutDir: false, lib: { entry: 'src/reference.ts', formats: ['es'], fileName: () => 'reference.js', cssFileName: 'reference' } } });
await mkdir('dist/native', { recursive: true }); await cp('favicon.svg', 'dist/native/favicon.svg');
for (const entry of ['console','reference']) await writeFile(`dist/native/${entry === 'console' ? 'index' : 'reference'}.html`, `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="/native/favicon.svg"><link rel="stylesheet" href="/native/assets/${entry}.css"><title>WorkerKit · 应用管理</title></head><body data-api-root="/native"><div id="root"></div><script type="module" src="/native/assets/${entry}.js"></script></body></html>`);
