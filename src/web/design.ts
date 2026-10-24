import type { ThemeConfig } from 'antd';

/** Shared defaults. Applications may override Ant Design tokens in WorkerKitProvider. */
export const workerKitTokens = {
  colorPrimary: '#315bd6',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 14,
  lineHeight: 1.6,
  controlHeight: 32,
  controlHeightSM: 24,
  controlHeightLG: 40,
  borderRadius: 10,
  sizeUnit: 4,
} satisfies NonNullable<ThemeConfig['token']>;

// A lighter brand foreground keeps links/icons readable on dark surfaces.
export const workerKitDarkTokens = {
  colorPrimary: '#7c9cff',
  colorLink: '#91aaff',
  colorLinkHover: '#b1c4ff',
  colorLinkActive: '#7c9cff',
  colorTextLightSolid: '#111827',
} satisfies NonNullable<ThemeConfig['token']>;

export const workerKitLayout = {
  sidebarWidth: 232,
  headerHeight: 64,
  contentMaxWidth: 1440,
  pagePadding: 32,
  mobilePagePadding: 16,
  navigationHeight: 44,
  accountHeight: 56,
  avatarSize: 32,
  iconSize: 20,
  iconGap: 12,
  pageTitleSize: 28,
  pageHeaderGap: 24,
  uploadHeight: 88,
} as const;
