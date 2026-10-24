import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import type { PluginOption } from 'vite';

/** Ordinary Vite plugins; the application owns its Vite configuration. */
export function workerKitPlugins(): PluginOption[] {
  return [react(), cloudflare()];
}
