/**
 * FisioFlow Design System - Theme Provider
 *
 * Complete theme configuration with dark mode support
 * Provides automatic re-rendering when theme changes
 */

import { Appearance, type NativeEventSubscription } from 'react-native';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ColorScheme } from './colors';
import { lightColors, darkColors, getColors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, shadows, zIndex, container } from './spacing';

/**
 * Complete Theme Interface
 */
export interface Theme {
  colors: typeof lightColors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  zIndex: typeof zIndex;
  container: typeof container;
  scheme: ColorScheme;
  isDark: boolean;
}

/**
 * Create theme object for given color scheme
 */
export function createTheme(scheme: ColorScheme): Theme {
  const colors = getColors(scheme);
  return {
    colors,
    typography,
    spacing,
    borderRadius,
    shadows,
    zIndex,
    container,
    scheme,
    isDark: scheme === 'dark',
  };
}

/**
 * Default theme (light mode)
 */
export const defaultTheme = createTheme('light');

/**
 * Dark theme
 */
export const darkTheme = createTheme('dark');

/**
 * Theme Context Type
 */
interface ThemeContextType {
  theme: Theme;
  scheme: ColorScheme;
  isDark: boolean;
  setScheme: (scheme: ColorScheme) => void;
  toggleTheme: () => void;
  setSystemTheme: () => void;
}

/**
 * Theme Context
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Theme Store Interface
 */
interface ThemeStore {
  scheme: ColorScheme;
  setScheme: (scheme: ColorScheme) => void;
}

/**
 * Async Storage for Zustand persist
 */
const storage = {
  async getItem(key: string) {
    const value = await AsyncStorage.getItem(key);
    return value ?? null;
  },
  async setItem(key: string, value: string) {
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
  },
};

/**
 * Theme Store with Zustand + Persistence
 */
const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      scheme: 'light',
      setScheme: (scheme) => set({ scheme }),
    }),
    {
      name: 'fisioflow-theme-storage',
      storage: storage as any,
    }
  )
);

/**
 * Theme Provider Props
 */
export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Initial color scheme */
  initialScheme?: ColorScheme;
  /** Follow system theme changes */
  followSystem?: boolean;
}

/**
 * Theme Provider Component
 * Wraps the app and provides theme context
 */
export function ThemeProvider({
  children,
  initialScheme,
  followSystem = true,
}: ThemeProviderProps) {
  const storeScheme = useThemeStore((state) => state.scheme);
  const setScheme = useThemeStore((state) => state.setScheme);

  const [scheme, setLocalScheme] = useState<ColorScheme>(
    initialScheme || storeScheme
  );

  // Update local scheme when store changes
  useEffect(() => {
    if (!initialScheme) {
      setLocalScheme(storeScheme);
    }
  }, [storeScheme, initialScheme]);

  // Listen to system appearance changes
  useEffect(() => {
    if (!followSystem || initialScheme) return;

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      const newScheme: ColorScheme = colorScheme === 'dark' ? 'dark' : 'light';
      setLocalScheme(newScheme);
      setScheme(newScheme);
    });

    return () => subscription.remove();
  }, [followSystem, initialScheme, setScheme]);

  // Create memoized theme object
  const theme = useMemo(() => createTheme(scheme), [scheme]);

  // Context value
  const contextValue = useMemo<ThemeContextType>(
    () => ({
      theme,
      scheme,
      isDark: theme.isDark,
      setScheme: (newScheme) => {
        setLocalScheme(newScheme);
        setScheme(newScheme);
      },
      toggleTheme: () => {
        const newScheme: ColorScheme = scheme === 'light' ? 'dark' : 'light';
        setLocalScheme(newScheme);
        setScheme(newScheme);
      },
      setSystemTheme: () => {
        const colorScheme = Appearance.getColorScheme();
        const newScheme: ColorScheme = colorScheme === 'dark' ? 'dark' : 'light';
        setLocalScheme(newScheme);
        setScheme(newScheme);
      },
    }),
    [theme, scheme, setScheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use theme
 * Returns the current theme object
 */
export function useTheme(): Theme {
  const context = useContext(ThemeContext);
  if (!context) {
    console.warn('useTheme must be used within ThemeProvider, falling back to default theme');
    return defaultTheme;
  }
  return context.theme;
}

/**
 * Hook to use theme with setters
 * Returns theme object and control functions
 */
export function useThemeControl(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeControl must be used within ThemeProvider');
  }
  return context;
}

/**
 * Hook to get color value by path
 * Useful for accessing nested color values
 *
 * @example
 * const primaryColor = useColor('primary.500'); // Returns '#3B82F6'
 */
export function useColor(path: string): string {
  const theme = useTheme();
  const keys = path.split('.');
  let value: any = theme.colors;
  for (const key of keys) {
    value = value[key];
  }
  return value;
}

/**
 * Legacy exports for backward compatibility
 * @deprecated Use ThemeProvider instead
 */
export const useThemeStore_Legacy = useThemeStore;
