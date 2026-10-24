import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { App, ConfigProvider, theme } from 'antd';

const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({ dark: false, toggle: () => {} });

export function WorkerKitProvider({ children, storageKey = 'workerkit.theme' }: { children: ReactNode; storageKey?: string }) {
  const [dark, setDark] = useState(() => {
    try { return typeof window !== 'undefined' && localStorage.getItem(storageKey) === 'dark'; }
    catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, dark ? 'dark' : 'light'); }
    catch { /* Storage may be disabled; theme switching still works. */ }
  }, [dark, storageKey]);
  const value = useMemo(() => ({ dark, toggle: () => setDark((current) => !current) }), [dark]);
  return <ThemeContext.Provider value={value}>
    <ConfigProvider theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#315bd6', borderRadius: 10 } }}>
      <App>{children}</App>
    </ConfigProvider>
  </ThemeContext.Provider>;
}

export const useWorkerKitTheme = () => useContext(ThemeContext);
