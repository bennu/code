'use client';

import { ThemeProvider, createTheme, CssBaseline, GlobalStyles } from '@mui/material';
import { ReactNode, useState, useEffect, useCallback } from 'react';
import { ToastProvider } from './Toast';
import { ThemeContext } from '@/lib/ThemeContext';

const typographyConfig = {
  fontFamily: 'var(--font-dm-sans)',
  h1: { fontFamily: 'var(--font-syne)', fontWeight: 800, letterSpacing: '-3px' },
  h2: { fontFamily: 'var(--font-syne)', fontWeight: 700 },
  h3: { fontFamily: 'var(--font-syne)', fontWeight: 700 },
  body1: { fontFamily: 'var(--font-dm-sans)' },
  body2: { fontFamily: 'var(--font-dm-sans)' },
  caption: { fontFamily: 'var(--font-dm-mono)' },
};

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#00bcd4' },
    secondary: { main: '#9c27b0' },
    background: { default: '#f5f4f0', paper: '#ffffff' },
    text: { primary: '#000000', secondary: '#666666' },
  },
  typography: typographyConfig,
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00bcd4' },
    secondary: { main: '#ce93d8' },
    background: { default: '#0f0f0f', paper: '#1a1a1a' },
    text: { primary: '#f0f0f0', secondary: '#aaaaaa' },
  },
  typography: typographyConfig,
});

export default function ThemeWrapper({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') setIsDark(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const theme = isDark ? darkTheme : lightTheme;
  const bgColor = isDark ? '#0f0f0f' : '#f5f4f0';
  const gridColor = isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)';
  const noiseOpacity = isDark ? '0.03' : '0.02';

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={{
            body: {
              background: bgColor,
              backgroundImage: `
                linear-gradient(0deg, transparent 24%, ${gridColor} 25%, ${gridColor} 26%, transparent 27%, transparent 74%, ${gridColor} 75%, ${gridColor} 76%, transparent 77%, transparent),
                linear-gradient(90deg, transparent 24%, ${gridColor} 25%, ${gridColor} 26%, transparent 27%, transparent 74%, ${gridColor} 75%, ${gridColor} 76%, transparent 77%, transparent)
              `,
              backgroundSize: '50px 50px',
              position: 'relative',
              transition: 'background 0.3s ease, color 0.3s ease',
            },
            'body::before': {
              content: '""',
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch' /%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23noiseFilter)' opacity='${noiseOpacity}'/%3E%3C/svg%3E")`,
              pointerEvents: 'none',
              zIndex: -1,
            },
          }}
        />
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
