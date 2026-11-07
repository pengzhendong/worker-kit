import {
  frontendPreviewPath,
  officialDemos,
} from '../examples/ui-suite/catalog.js';
import { browserOptions } from './browser.mjs';
import { chromium, expect } from '@playwright/test';

const base = process.env.PAYLOAD_PREVIEW_URL || 'http://kit.localhost:5184';
const browser = await chromium.launch(browserOptions);

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();
  const headers = { Origin: base };
  const login = await context.request.post(base + '/api/users/login', {
    headers,
    data: { username: 'admin', password: 'password' },
  });
  expect(login.status()).toBe(200);
  const frame = page.frameLocator('#preview');
  const tab = (name) => page.getByRole('tab', { name, exact: true });
  const category = page.getByRole('combobox', { name: '预览类别' });

  await page.goto(base + '/?view=naive&preload=off');
  await expect(page.locator('#preview')).toHaveAttribute(
    'src',
    base + frontendPreviewPath('naive'),
  );
  await expect(page.locator('#open')).toHaveAttribute(
    'href',
    officialDemos.naive,
  );
  await frame.getByText('弹窗', { exact: true }).click();
  await expect(
    frame.getByRole('heading', { name: '弹窗', exact: true }),
  ).toBeVisible();

  await expect(tab('PrimeVue')).toBeVisible();
  await expect(tab('Sakai')).toHaveCount(0);
  await tab('PrimeVue').click();
  await expect(frame.locator('.primevue-shell')).toBeVisible();
  await expect(frame.locator('.layout-wrapper')).toHaveCount(0);
  await tab('Naive UI').click();
  await category.selectOption('templates');
  await expect(tab('PrimeVue')).toHaveCount(0);
  await expect(tab('Sakai')).toHaveAttribute('aria-selected', 'true');
  await expect(frame.locator('.layout-wrapper')).toBeVisible();
  await expect(page.locator('#preview')).toHaveAttribute(
    'src',
    base + frontendPreviewPath('prime'),
  );
  await category.selectOption('components');
  await expect(tab('Naive UI')).toHaveAttribute('aria-selected', 'true');
  await category.selectOption('backend');
  await expect(page.getByRole('tablist', { name: '组件库方案' })).toBeHidden();
  await expect(page.getByRole('tab', { name: /工作台/ })).toHaveCount(0);
  await tab('Payload').click();
  await frame.locator('.nav-toggler[aria-label="Open Menu"]:visible').click();
  await frame.getByRole('link', { name: '应用运维', exact: true }).click();
  await expect(frame.locator('[data-workspace]')).toContainText('依赖正常');
  const backendFrame = await page.locator('#preview').elementHandle();

  await category.selectOption('components');
  await expect(
    frame.getByRole('heading', { name: '弹窗', exact: true }),
  ).toBeVisible();
  expect(await backendFrame.evaluate((element) => element.isConnected)).toBe(
    false,
  );
  await context.request.post(base + '/api/users/logout', { headers });
  await category.selectOption('backend');
  await expect(tab('Payload')).toHaveAttribute('aria-selected', 'true');
  await expect(
    frame.getByRole('button', { name: 'Login', exact: true }),
  ).toBeVisible();
  await expect(frame.getByText('依赖正常', { exact: true })).toHaveCount(0);

  await tab('SonicJS').click();
  await expect(frame.locator('form#login-form')).toBeVisible();
  await category.selectOption('components');
  await tab('Nuxt UI').click();
  await expect(page.locator('#preview')).toHaveAttribute(
    'src',
    base + frontendPreviewPath('nuxt'),
  );
  await expect(
    frame.getByRole('heading', { name: '表格', exact: true }).last(),
  ).toBeVisible();

  await page.getByRole('button', { name: '手机', exact: true }).click();
  await expect(page.locator('#preview')).toHaveClass('mobile');
  await page.setViewportSize({ width: 390, height: 844 });
  await category.selectOption('docs');
  await expect(tab('VitePress')).toBeVisible();
  await expect(tab('Nuxt UI')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  console.log(
    'PASS: frontend and backend tabs switch independently, public UI state survives, backend frames reload after logout.',
  );
} finally {
  await browser.close();
}
