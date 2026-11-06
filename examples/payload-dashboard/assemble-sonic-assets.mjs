import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function assembleSonicAssets(target) {
  const here = fileURLToPath(new URL('./', import.meta.url));
  const manifest = JSON.parse(await readFile(path.join(here, 'sonic-assets.json'), 'utf8'));
  const cache = path.resolve(here, '../../.wrangler/sonic-assets');
  await mkdir(cache, { recursive: true });
  await mkdir(path.join(target, 'sonic-static'), { recursive: true });
  for (const asset of manifest.assets) {
    const cached = path.join(cache, asset.sha256);
    let bytes;
    try { bytes = await readFile(cached); }
    catch {
      const response = await fetch(asset.url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`SonicJS asset download failed: ${asset.url} (${response.status})`);
      bytes = Buffer.from(await response.arrayBuffer());
    }
    if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error(`SonicJS asset checksum changed: ${asset.url}`);
    await writeFile(cached, bytes);
    await writeFile(path.join(target, asset.path), bytes);
  }
  await cp(path.join(here, 'sonic-fonts.css'), path.join(target, manifest.fontCss));
}
