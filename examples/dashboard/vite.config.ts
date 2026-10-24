import { defineConfig } from 'vite';
import { workerKitPlugins } from '@pengzhendong/worker-kit/tooling/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({ plugins: workerKitPlugins(), environments: { client: { build: { rolldownOptions: { input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), reference: fileURLToPath(new URL('./reference.html', import.meta.url)) } } } } } });
