import { defineConfig } from 'vite';
import { workerKitPlugins } from '@pengzhendong/worker-kit/tooling/vite';

export default defineConfig({ plugins: workerKitPlugins() });
