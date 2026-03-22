/**
 * useTheme Hook
 * Enhanced theme hook with more utilities
 */

import { useMemo } from 'react';
import { useColors as useBaseColors, useColorScheme } from '@/hooks/useColorScheme';
import { getTheme, ThemeUtils, ThemePersistence, type Theme } from '@/lib/theme';

export function useTheme(): Theme & {
  setTheme: (mode: 'light' | 'dark' | 'auto') => Promise<void>;
  colorWithOpacity: (color: string, opacity: number) => string;
  darken: (color: string, percent?: number) => string;
  lighten: (color: string, percent?: number) => string;
  getContrastColor: (color: string) => '#000000' | '#FFFFFF';
} {
  const baseColors = useBaseColors();
  const systemScheme = useColorScheme();

  const theme = useMemo(() => getTheme('auto', systemScheme), [baseColors, systemScheme]);

  const setTheme = async (mode: 'light' | 'dark' | 'auto') => {
    await ThemePersistence.saveTheme(mode);
    // Note: In a real app, you'd trigger a re-render here
  };

  return {
    ...theme,
    setTheme,
    colorWithOpacity: ThemeUtils.colorWithOpacity,
    darken: ThemeUtils.darken,
    lighten: ThemeUtils.lighten,
    getContrastColor: ThemeUtils.getContrastColor,
  };
}

export default useTheme;
