import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../examples/dashboard/dist/client', import.meta.url));
const developmentMarkers = ['/cdn-cgi/local/explorer', '打开 Worker 调试器', '开发工具'];
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await check(path);
    else if (/\.(js|html)$/.test(entry.name)) {
      const content = await readFile(path, 'utf8');
      if (entry.name.startsWith('ToolsPage-') || developmentMarkers.some((marker) => content.includes(marker))) {
        throw new Error(`Development tools leaked into production UI: ${entry.name}`);
      }
    }
  }
}
await check(root);
console.log('Production UI excludes development tools and local debugging links.');
