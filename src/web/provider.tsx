import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { App, ConfigProvider, theme } from 'antd';
import type { ConfigProviderProps, ThemeConfig } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { workerKitDarkTokens, workerKitTokens } from './design';

const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({ dark: false, toggle: () => {} });

function ThemeSurface({ children }: { children: ReactNode }) {
  const { token } = theme.useToken();
  const variables = {
    '--wk-font-family': token.fontFamily,
    '--wk-font-family-code': token.fontFamilyCode,
    '--wk-font-size': `${token.fontSize}px`,
    '--wk-font-size-sm': `${token.fontSizeSM}px`,
    '--wk-font-size-lg': `${token.fontSizeLG}px`,
    '--wk-line-height': token.lineHeight,
    '--wk-line-height-sm': token.lineHeightSM,
    '--wk-color-primary': token.colorPrimary,
    '--wk-color-primary-bg': token.colorPrimaryBg,
    '--wk-color-primary-text': token.colorPrimaryText,
    '--wk-color-primary-border': token.colorPrimaryBorder,
    '--wk-color-surface': token.colorBgContainer,
    '--wk-color-text-secondary': token.colorTextSecondary,
    '--wk-color-success': token.colorSuccess,
    '--wk-color-layout': token.colorBgLayout,
    '--wk-color-text': token.colorText,
    '--wk-color-border': token.colorBorderSecondary,
    '--wk-color-hover': token.colorFillQuaternary,
  } as CSSProperties;
  return <App style={variables}>{children}</App>;
}

export function WorkerKitProvider({ children, storageKey = 'workerkit.theme', theme: themeOverrides, locale = zhCN }: { children: ReactNode; storageKey?: string; theme?: ThemeConfig | ((dark: boolean) => ThemeConfig); locale?: ConfigProviderProps['locale'] }) {
  const [dark, setDark] = useState(() => {
    try { return typeof window !== 'undefined' && localStorage.getItem(storageKey) === 'dark'; }
    catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, dark ? 'dark' : 'light'); }
    catch { /* Storage may be disabled; theme switching still works. */ }
  }, [dark, storageKey]);
  const value = useMemo(() => ({ dark, toggle: () => setDark((current) => !current) }), [dark]);
  const overrides = typeof themeOverrides === 'function' ? themeOverrides(dark) : themeOverrides;
  return <ThemeContext.Provider value={value}>
    <ConfigProvider locale={locale} theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm, ...overrides, token: { ...workerKitTokens, ...(dark ? workerKitDarkTokens : {}), ...overrides?.token } }}>
      <ThemeSurface>{children}</ThemeSurface>
    </ConfigProvider>
  </ThemeContext.Provider>;
}

export const useWorkerKitTheme = () => useContext(ThemeContext);
