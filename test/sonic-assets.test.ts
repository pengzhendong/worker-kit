import { describe, expect, it } from 'vitest';
import { localizeSonicAssets } from '../examples/payload-dashboard/app/src/workerkit/sonic-assets';
import manifest from '../examples/payload-dashboard/sonic-assets.json';

describe('SonicJS public dependency localization', () => {
  it('handles split CSS text, preserves native scripts/routes and private response headers', async () => {
    const font = manifest.fontAliases[0];
    const pieces = ['<html><head><style>@import url("' + font.slice(0,35), font.slice(35) + '");body{color:red}</style>', '<script src="https://cdn.tailwindcss.com"></script><script>tailwind.config={darkMode:"class"}</script>', '</head><body><a href="/auth/logout">Logout</a></body></html>'];
    const stream = new ReadableStream({ start(controller) { for (const text of pieces) controller.enqueue(new TextEncoder().encode(text)); controller.close(); } });
    const response = localizeSonicAssets(new Response(stream, { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store', 'Set-Cookie': 'test=value; HttpOnly' } }));
    const html = await response.text();
    expect(html).toContain(`@import url("${manifest.fontCss}");body{color:red}`);
    expect(html).toContain('<script>tailwind.config={darkMode:"class"}</script>');
    expect(html).toContain('href="/auth/logout"');
    expect(html).not.toContain('https://cdn.tailwindcss.com');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
  });
  it('rewrites only pinned public assets and leaves APIs and other plugin assets untouched', async () => {
    const json = Response.json({ value: 'https://cdn.tailwindcss.com' });
    expect(localizeSonicAssets(json)).toBe(json);
    const html = await localizeSonicAssets(new Response('<link rel="stylesheet" href="' + manifest.fontAliases[0] + '"><script src="https://plugins.example/plugin.js"></script>', { headers: { 'Content-Type': 'text/html' } })).text();
    expect(html).toContain('href="' + manifest.fontCss + '"');
    expect(html).toContain('src="https://plugins.example/plugin.js"');
  });
});
