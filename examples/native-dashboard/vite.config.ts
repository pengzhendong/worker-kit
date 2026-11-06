import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import ui from '@nuxt/ui/vite';
export default defineConfig({
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  resolve: { dedupe: ['vue', 'vue-router'] },
  plugins: [vue(), ui({ ui: { colors: { primary: 'blue', neutral: 'slate' } }, icon: { clientBundle: { scan: true } } })],
  build: { target: 'es2022', outDir: 'dist/native/assets', lib: { entry: 'src/main.ts', formats: ['es'], fileName: () => 'console.js', cssFileName: 'console' } },
});
