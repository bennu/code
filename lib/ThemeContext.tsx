'use client';

import { createContext, useContext } from 'react';

export const ThemeContext = createContext({
  isDark: false,
  toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);
