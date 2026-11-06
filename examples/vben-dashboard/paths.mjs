import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
const root = fileURLToPath(new URL('../../', import.meta.url));
const pins = JSON.parse(await readFile(path.join(root, 'ui-upstreams.json'), 'utf8'));
export const vbenWorkDirectory = path.join(root, '.wrangler/ui-build', `vben-${pins.vben.commit}`);
export const vbenBuildDirectory = path.join(vbenWorkDirectory, 'apps/workerkit-demo/dist');
