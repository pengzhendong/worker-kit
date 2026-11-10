import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';
import { createRenderer, createSSRApp, h, nextTick, ref } from 'vue';
import { renderToString } from 'vue/server-renderer';

test('Vue API resources can defer requests until mount', async () => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true, watch: null, ws: false },
  });
  try {
    const { useApiResource } = await vite.ssrLoadModule('/src/vue/index.ts');
    const requests = [];
    const client = async (path) => {
      requests.push(path);
      return path;
    };
    const source = ref('/api/initial');
    let resource;
    const component = {
      setup() {
        resource = useApiResource(client, source, { deferUntilMounted: true });
        return () => h('div', 'Loading');
      },
    };
    assert.equal(await renderToString(createSSRApp(component)), '<div>Loading</div>');
    assert.deepEqual(requests, []);

    const { createApp } = createRenderer({
      createElement: () => ({}),
      insert() {},
      remove() {},
      setElementText() {},
    });
    const app = createApp(component);
    app.mount({});
    await nextTick();
    assert.deepEqual(requests, ['/api/initial']);
    assert.equal(resource.data.value, '/api/initial');
    assert.equal(resource.busy.value, false);

    source.value = '/api/other';
    await nextTick();
    resource.refresh();
    await nextTick();
    assert.deepEqual(requests, ['/api/initial', '/api/other', '/api/other']);
    app.unmount();

    await renderToString(createSSRApp({
      setup() {
        useApiResource(client, '/api/eager');
        return () => h('div');
      },
    }));
    assert.equal(requests.at(-1), '/api/eager');
  } finally {
    await vite.close();
  }
});
