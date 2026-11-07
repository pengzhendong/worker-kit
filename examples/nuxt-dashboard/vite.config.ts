import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import ui from '@nuxt/ui/vite';

export default defineConfig({
  base: process.env.WORKERKIT_DEMO_BASE || '/',
  resolve: { dedupe: ['vue', 'vue-router'] },
  plugins: [vue(), ui({
    ui: { colors: { primary: 'blue', neutral: 'slate' } },
    icon: { clientBundle: { scan: true, icons: ['lucide:table-2', 'lucide:library-big', 'lucide:text-cursor-input', 'lucide:panels-top-left', 'lucide:scan-eye', 'lucide:layout-panel-left', 'lucide:palette', 'lucide:chart-no-axes-combined', 'lucide:waypoints', 'lucide:tv-minimal', 'lucide:circle-check', 'lucide:triangle-alert', 'lucide:circle-pause', 'lucide:loader-circle', 'lucide:audio-lines', 'lucide:clapperboard'] } },
  })],
});
