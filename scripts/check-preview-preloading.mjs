import { browserOptions } from './browser.mjs';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.PAYLOAD_PREVIEW_URL || 'http://kit.localhost:5184';
const sonic =
  process.env.SONIC_PREVIEW_URL || 'http://sonic.kit.localhost:5184';
const browser = await chromium.launch(browserOptions);
const samples = [],
  errors = [];
const views = [
  ['PrimeVue / Sakai', 'prime'],
  ['Vben Admin', 'vben'],
  ['Ant Design Pro', 'pro'],
  ['Refine', 'refine'],
  ['Tabler', 'tabler'],
  ['AdminLTE', 'adminlte'],
  ['VitePress', 'docs'],
];
async function fixture(saveData = false) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  if (saveData)
    await context.addInitScript(() =>
      Object.defineProperty(navigator, 'connection', {
        value: { saveData: true, effectiveType: '4g' },
      }),
    );
  expect(
    (
      await context.request.post(base + '/api/users/login', {
        headers: { Origin: base },
        data: { username: 'admin', password: 'password' },
      })
    ).status(),
  ).toBe(200);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    if (window !== top) return;
    window.__maxWarming = 0;
    new MutationObserver(() => {
      window.__maxWarming = Math.max(
        window.__maxWarming,
        document.querySelectorAll('iframe[data-preload-state="loading"]')
          .length,
      );
    }).observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-preload-state'],
    });
  });
  return { context, page };
}
const workspace = (page) =>
  page.frameLocator('#preview').locator('[data-workspace]');
try {
  {
    const { context, page } = await fixture();
    const data = await (
      await context.request.get(base + '/api/workerkit/workspace')
    ).json();
    let release;
    const firstRead = new Promise((resolve) => {
      release = resolve;
    });
    const reads = [],
      navigations = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/workerkit/workspace')
        reads.push(new URL(request.url()).origin);
      if (request.isNavigationRequest() && request.frame() !== page.mainFrame())
        navigations.push(request.url());
    });
    let held = false;
    await page.route('**/api/workerkit/workspace', async (route) => {
      if (!held) {
        held = true;
        await firstRead;
        await route.fulfill({ json: data });
      } else await route.continue();
    });
    try {
      await page.goto(base + '/?view=nuxt');
      await expect.poll(() => reads.length).toBe(1);
      await page.waitForTimeout(600); // The held foreground read must prevent idle warmup.
      await expect(page.locator('iframe')).toHaveCount(1);
      await expect(
        page.getByRole('tab', { name: 'Vben Admin', exact: true }),
      ).toHaveAttribute('data-preload-status', 'waiting');
      release();
      await expect(workspace(page)).toContainText('依赖正常', {
        timeout: 30000,
      });
      await expect(
        page.locator('iframe[data-preload-state="ready"]'),
      ).toHaveCount(7, { timeout: 120000 });
      expect(reads).toEqual([base]);
      await expect(
        page.locator('button[data-preload-status=ready]'),
      ).toHaveCount(8);
      await expect(
        page.getByRole('tab', { name: 'Vben Admin', exact: true }),
      ).toHaveAccessibleDescription('界面已就绪，业务数据另行刷新');
      expect(
        await page
          .locator('header')
          .evaluate((element) => element.getBoundingClientRect().height),
      ).toBe(52);
      await mkdir('test-results/preview-preloading', { recursive: true });
      await page
        .locator('header')
        .screenshot({ path: 'test-results/preview-preloading/tabs-ready.png' });
      expect(await page.evaluate(() => window.__maxWarming)).toBe(1);
      await expect(
        page.getByRole('tab', { name: 'Nuxt UI', exact: true }),
      ).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('iframe:visible')).toHaveCount(1);
      expect(navigations).toHaveLength(8);
      console.log(
        'Seven frontends warmed sequentially; foreground unchanged; no background business reads.',
      );
      for (const [name, view] of views) {
        const before = navigations.length,
          start = performance.now();
        await page.getByRole('tab', { name, exact: true }).click();
        await expect(page.locator('.stage')).toHaveAttribute(
          'aria-busy',
          'false',
          { timeout: 1000 },
        );
        const shellMs = Math.round(performance.now() - start);
        await expect(workspace(page)).toContainText('依赖正常', {
          timeout: 30000,
        });
        expect(navigations.length).toBe(before);
        expect(
          await page
            .frameLocator('#preview')
            .locator('body')
            .evaluate(() => document.documentElement.scrollWidth > innerWidth),
        ).toBe(false);
        samples.push({
          view,
          firstVisit: true,
          shellMs,
          dataMs: Math.round(performance.now() - start),
          newDocuments: navigations.length - before,
        });
        console.log(JSON.stringify(samples.at(-1)));
      }
      expect(reads).toHaveLength(8);
      // Opening the current CMS keeps all eight green markers and documents.
      const beforeCms = navigations.length;
      await page.getByRole('tab', { name: 'Payload', exact: true }).click();
      await expect(page.locator('iframe')).toHaveCount(9);
      await expect(
        page.locator('button[data-preload-status=ready]'),
      ).toHaveCount(8);
      await page.waitForTimeout(300);
      expect(reads).toHaveLength(8);
      await page.getByRole('tab', { name: 'Nuxt UI', exact: true }).click();
      await expect(workspace(page)).toContainText('依赖正常');
      expect(
        navigations
          .slice(beforeCms)
          .every((url) => /^\/admin(?:\/|$)/.test(new URL(url).pathname)),
      ).toBe(true);
      await expect(
        page.locator('button[data-preload-status=ready]'),
      ).toHaveCount(8);
      await page.getByLabel('选择后端').selectOption('sonic');
      await expect(workspace(page)).toContainText('登录后端', {
        timeout: 30000,
      });
      await expect(
        page.locator('iframe[data-preload-state="ready"]').first(),
      ).toBeAttached({ timeout: 60000 });
      expect(
        await page
          .locator('iframe')
          .evaluateAll((elements) =>
            elements.every(
              (element) =>
                new URL(element.src).origin ===
                new URL(document.body.dataset.sonicOrigin).origin,
            ),
          ),
      ).toBe(true);
      expect(reads.filter((origin) => origin === sonic)).toHaveLength(1);
      await page.getByRole('tab', { name: 'Payload', exact: true }).click();
      await expect(page.locator('iframe')).toHaveCount(1);
      await page.waitForTimeout(500);
      await expect(page.locator('iframe')).toHaveCount(1);
      console.log(
        'Same-backend CMS keeps prepared frameworks; backend switch isolates instances; native CMS is not preloaded.',
      );
    } finally {
      release();
      await context.close();
    }
  }
  {
    const { context, page } = await fixture();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    await page.route('**/prime/workspace', async (route) => {
      await gate;
      await route.continue().catch(() => {});
    });
    try {
      await page.goto(base + '/?view=nuxt');
      await expect(workspace(page)).toContainText('依赖正常', {
        timeout: 30000,
      });
      const prime = page.locator(
        'iframe[data-preload-state="loading"][src$="/prime/workspace"]',
      );
      await expect(prime).toBeAttached();
      await expect(
        page.getByRole('tab', { name: 'PrimeVue / Sakai', exact: true }),
      ).toHaveAttribute('data-preload-status', 'loading');
      await expect(
        page.getByRole('tab', { name: 'PrimeVue / Sakai', exact: true }),
      ).toHaveAccessibleDescription('正在准备界面');
      await page
        .locator('header')
        .screenshot({
          path: 'test-results/preview-preloading/tabs-loading.png',
        });
      const old = await prime.elementHandle();
      await page.getByRole('tab', { name: 'Vben Admin', exact: true }).hover();
      await expect(
        page.locator(
          'iframe[data-preload-state="ready"][src$="/vben/workspace"]',
        ),
      ).toBeAttached({ timeout: 60000 });
      expect(await old.evaluate((element) => element.isConnected)).toBe(false);
      await expect(prime).toBeAttached();
      const interrupted = await prime.elementHandle();
      await page.getByRole('tab', { name: 'AdminLTE', exact: true }).click();
      await expect(workspace(page)).toContainText('依赖正常', {
        timeout: 30000,
      });
      expect(await interrupted.evaluate((element) => element.isConnected)).toBe(
        false,
      );
      await expect(page.locator('#preview')).toHaveAttribute(
        'src',
        base + '/adminlte/workspace',
      );
      expect(await page.evaluate(() => window.__maxWarming)).toBe(1);
      console.log(
        'Hover prioritizes the intended frontend; foreground clicks interrupt an unrelated preload.',
      );
    } finally {
      release();
      await context.close();
    }
  }
  {
    const { context, page } = await fixture(true);
    try {
      await page.goto(base + '/?view=nuxt');
      await expect(workspace(page)).toContainText('依赖正常', {
        timeout: 30000,
      });
      await page.getByRole('tab', { name: 'Vben Admin', exact: true }).hover();
      await page.waitForTimeout(600);
      await expect(page.locator('iframe')).toHaveCount(1);
      await expect(
        page.getByRole('tab', { name: 'Vben Admin', exact: true }),
      ).toHaveAttribute('data-preload-status', 'disabled');
      await expect(
        page.getByRole('tab', { name: 'Vben Admin', exact: true }),
      ).toHaveAccessibleDescription('自动预加载已关闭，点击后加载');
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .getByRole('tab', { name: 'VitePress', exact: true })
        .scrollIntoViewIfNeeded();
      await expect(
        page.getByRole('tab', { name: 'VitePress', exact: true }),
      ).toBeInViewport();
      await page
        .locator('header')
        .screenshot({
          path: 'test-results/preview-preloading/tabs-mobile.png',
        });
      console.log('Save-Data suppresses background warmup.');
    } finally {
      await context.close();
    }
  }
  {
    const { context, page } = await fixture();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    await page.route('**/prime/workspace', async (route) => {
      await gate;
      await route.continue().catch(() => {});
    });
    try {
      await page.goto(base + '/?view=nuxt');
      await expect(workspace(page)).toContainText('依赖正常', {
        timeout: 30000,
      });
      const tab = page.getByRole('tab', {
        name: 'PrimeVue / Sakai',
        exact: true,
      });
      await expect(tab).toHaveAttribute('data-preload-status', 'loading');
      await expect(tab).toHaveAttribute('data-preload-status', 'failed', {
        timeout: 20000,
      });
      await expect(tab).toHaveAccessibleDescription('预加载未完成，点击后加载');
      await page
        .locator('header')
        .screenshot({
          path: 'test-results/preview-preloading/tabs-failed.png',
        });
      release();
      await page.unroute('**/prime/workspace');
      await tab.click();
      await expect(workspace(page)).toContainText('依赖正常', {
        timeout: 30000,
      });
      await expect(tab).toHaveAttribute('data-preload-status', 'ready');
      console.log(
        'A stalled preload shows a failure marker; clicking still loads the frontend.',
      );
    } finally {
      release();
      await context.close();
    }
  }
  expect(errors).toEqual([]);
  await mkdir('test-results/preview-preloading', { recursive: true });
  await writeFile(
    'test-results/preview-preloading/result.json',
    JSON.stringify(
      {
        base,
        samples,
        maxConcurrentPreload: 1,
        backgroundBusinessReads: 0,
        hoverPriority: true,
        foregroundPreemption: true,
        backendIsolation: true,
        errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
