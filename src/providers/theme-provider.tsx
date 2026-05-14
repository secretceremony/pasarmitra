import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useUIStore } from '../store/use-ui-store';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { theme } = useUIStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  return <>{children}</>;
};
