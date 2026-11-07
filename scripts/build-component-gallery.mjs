import { copyFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import {
  ElementPlusResolver,
  NaiveUiResolver,
  PrimeVueResolver,
  QuasarResolver,
  Vuetify3Resolver,
} from 'unplugin-vue-components/resolvers';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(
  path.join(root, 'examples/vue-components/vite.config.ts'),
);
const compiler = require('@vue/compiler-sfc');
compiler.registerTS(() => require('typescript'));
const gallery = path.join(root, 'examples/ui-suite/gallery');
const catalog = JSON.parse(
  await readFile(path.join(gallery, 'component-index.json'), 'utf8'),
);
const libraries = Object.keys(catalog);
const official = JSON.parse(
  await readFile(path.join(gallery, 'official/sources.json'), 'utf8'),
);
const componentResolvers = {
  element: () => ElementPlusResolver({ importStyle: false }),
  naive: NaiveUiResolver,
  primevue: PrimeVueResolver,
  quasar: QuasarResolver,
  vuetify: Vuetify3Resolver,
};

async function renderSsrFixture(library) {
  if (library === 'mui') {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { default: InitColorSchemeScript } = await import(
      '@mui/material/InitColorSchemeScript'
    );
    return Object.fromEntries(
      ['light', 'dark'].map((defaultMode) => [
        defaultMode,
        renderToStaticMarkup(
          createElement(InitColorSchemeScript, {
            defaultMode,
            attribute: 'data-workerkit-demo-mode',
            modeStorageKey: 'workerkit-gallery-init-mode',
            colorSchemeStorageKey: 'workerkit-gallery-init-scheme',
          }),
        ),
      ]),
    );
  }

  if (library === 'vuetify' || library === 'quasar') {
    const { createSSRApp, h } = await import('vue');
    const { renderToString } = await import('vue/server-renderer');
    const content = { default: () => h('span', '客户端已挂载') };
    if (library === 'quasar') {
      const { QNoSsr } = await import('quasar');
      return renderToString(h(QNoSsr, { placeholder: '服务器占位' }, content));
    }
    const { createVuetify } = await import('vuetify');
    const { VNoSsr } = await import('vuetify/components/VNoSsr');
    const app = createSSRApp(() => h(VNoSsr, null, content));
    return renderToString(app.use(createVuetify({ ssr: true })));
  }
}

for (const library of process.argv.length > 2
  ? process.argv.slice(2)
  : libraries) {
  if (!libraries.includes(library))
    throw new Error('Unknown gallery library: ' + library);
  const source = official[library];
  const routeNames = new Set(catalog[library][3].map(([route]) => route));
  const officialImports = Object.entries(source?.samples ?? {}).map(
    ([route, { file }]) => {
      if (!routeNames.has(route))
        throw new Error(`${library}: unknown official example ${route}`);
      return `${JSON.stringify(route)}: () => import(${JSON.stringify(path.join(gallery, 'official', library, file))})`;
    },
  );
  const id = '\0workerkit-gallery-official';
  const ssrFixtureId = '\0workerkit-gallery-ssr-fixture';
  const plugins = [
    vue({ compiler }),
    {
      name: 'workerkit-gallery-official',
      resolveId: (sourceId) => (sourceId === '#gallery-official' ? id : null),
      load: (resolvedId) =>
        resolvedId === id
          ? `export default {${officialImports.join(',')}};`
          : null,
    },
    {
      name: 'workerkit-gallery-ssr-fixture',
      resolveId: (sourceId) =>
        sourceId === '#gallery-ssr-fixture' ? ssrFixtureId : null,
      async load(resolvedId) {
        if (resolvedId !== ssrFixtureId) return null;
        return `export default ${JSON.stringify(await renderSsrFixture(library))};`;
      },
    },
  ];
  if (source && componentResolvers[library])
    plugins.push(
      Components({
        dirs: [],
        dts: false,
        include: [/\/official\/[^?]+\.vue(?:\?.*)?$/],
        resolvers: componentResolvers[library](),
      }),
    );
  if (source && ['mui', 'mantine'].includes(library)) {
    const { default: react } = await import('@vitejs/plugin-react');
    plugins.push(react());
  }

  if (library === 'nuxt') {
    const { default: ui } = await import('@nuxt/ui/vite');
    const sampleIcons = new Set();
    for (const { file } of Object.values(source?.samples ?? {})) {
      const code = await readFile(
        path.join(gallery, 'official', library, file),
        'utf8',
      );
      for (const [, icon] of code.matchAll(/\bi-lucide-([a-z0-9-]+)/g)) {
        sampleIcons.add('lucide:' + icon);
      }
    }
    plugins.push(
      ui({
        dts: false,
        // Content controls are imported explicitly and receive local document data.
        content: true,
        ui: { colors: { primary: 'blue', neutral: 'slate' } },
        icon: {
          clientBundle: {
            icons: [
              ...sampleIcons,
              'lucide:arrow-left',
              'lucide:arrow-right',
              'lucide:calendar',
              'lucide:calendar-days',
              'lucide:check',
              'lucide:chevron-down',
              'lucide:chevron-left',
              'lucide:chevron-right',
              'lucide:chevron-up',
              'lucide:chevrons-up-down',
              'lucide:chevrons-left',
              'lucide:chevrons-right',
              'lucide:circle-check',
              'lucide:cog',
              'lucide:credit-card',
              'lucide:file',
              'lucide:info',
              'lucide:loader-circle',
              'lucide:map-pin',
              'lucide:menu',
              'lucide:minus',
              'lucide:plus',
              'lucide:search',
              'lucide:star',
              'lucide:star-half',
              'lucide:upload',
              'lucide:user',
              'lucide:x',
            ],
          },
        },
      }),
    );
  }
  if (library === 'shadcn') {
    const { default: tailwind } = await import('@tailwindcss/vite');
    plugins.push(tailwind());
  }
  const outDir = path.join(root, 'dist/ui-suite', library, 'gallery');
  await build({
    configFile: false,
    root: gallery,
    base: `/${library}/gallery/`,
    define: { __GALLERY_LIBRARY__: JSON.stringify(library) },
    resolve: {
      alias: {
        '@': path.join(root, 'examples/vue-components/src'),
        '#gallery-adapter': path.join(gallery, library + '.js'),
      },
      dedupe: ['vue', 'react', 'react-dom'],
    },
    plugins,
    logLevel: 'warn',
    build: {
      target: 'es2022',
      outDir,
      emptyOutDir: true,
    },
  });
  if (library === 'shadcn')
    await copyFile(
      path.join(gallery, 'shadcn-components/LICENSE'),
      path.join(outDir, 'LICENSE.txt'),
    );
  if (source)
    await copyFile(
      path.join(gallery, 'official', library, 'LICENSE.txt'),
      path.join(outDir, 'OFFICIAL-LICENSE.txt'),
    );
  console.log('Built component gallery: ' + library);
}
