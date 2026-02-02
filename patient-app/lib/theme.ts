/**
 * Theme System
 * Comprehensive theme configuration with light/dark modes
 */

import { useColorScheme } from 'react-native';
import { useColorScheme as useReactNativeColorScheme } from '@/hooks/useColorScheme';
import { AsyncStorage } from '@/lib/storage';

/**
 * Theme colors for light mode
 * Based on Activity Fisioterapia logo - Baby Blue palette
 */
const lightColors = {
  // Primary - Baby Blue (cor principal da marca)
  primary: '#0284C7',
  primaryLight: '#7DD3FC',
  primaryDark: '#0369A1',

  success: '#22c55e',
  successLight: '#86efac',
  successDark: '#16a34a',

  warning: '#f59e0b',
  warningLight: '#fcd34d',
  warningDark: '#d97706',

  error: '#ef4444',
  errorLight: '#fca5a5',
  errorDark: '#dc2626',

  // Secondary - Logo Original Blue (Activity brand color)
  info: '#5EB3E6',
  infoLight: '#7DD3FC',
  infoDark: '#0284C7',

  // Accent - Coral (cor quente para destaque)
  accent: '#F97316',
  accentLight: '#FDBA74',
  accentDark: '#EA580C',

  background: '#FFFFFF',
  surface: '#F3F4F6',
  surfaceVariant: '#E5E7EB',

  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  border: '#E5E7EB',
  divider: '#F3F4F6',

  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5).',

  // Semantic colors
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#6B7280',

  // Exercise colors
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',

  // Pain colors
  painLow: '#22c55e',
  painMedium: '#f59e0b',
  painHigh: '#ef4444',

  // Status colors
  online: '#22c55e',
  offline: '#9CA3AF',
  busy: '#ef4444',
};

/**
 * Theme colors for dark mode
 * Based on Activity Fisioterapia logo - Baby Blue palette
 */
const darkColors = {
  // Primary - Baby Blue (adapted for dark mode)
  primary: '#38BDF8',
  primaryLight: '#7DD3FC',
  primaryDark: '#0284C7',

  success: '#22c55e',
  successLight: '#4ade80',
  successDark: '#15803d',

  warning: '#f59e0b',
  warningLight: '#fbbf24',
  warningDark: '#b45309',

  error: '#ef4444',
  errorLight: '#f87171',
  errorDark: '#b91c1c',

  // Secondary - Logo Original Blue (adapted for dark mode)
  info: '#7DD3FC',
  infoLight: '#BAE6FD',
  infoDark: '#0284C7',

  // Accent - Coral (adapted for dark mode)
  accent: '#FB923C',
  accentLight: '#FDBA74',
  accentDark: '#EA580C',

  background: '#111827',
  surface: '#1F2937',
  surfaceVariant: '#374151',

  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',

  border: '#374151',
  divider: '#1F2937',

  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.7).',

  // Semantic colors
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#9CA3AF',

  // Exercise colors
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',

  // Pain colors
  painLow: '#22c55e',
  painMedium: '#f59e0b',
  painHigh: '#ef4444',

  // Status colors
  online: '#22c55e',
  offline: '#6B7280',
  busy: '#ef4444',
};

/**
 * Typography configuration
 */
const typography = {
  // Font families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },

  // Font sizes
  fontSize: {
    xxs: 10,
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    display: 28,
    heading: 32,
  },

  // Font weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

/**
 * Spacing scale
 */
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

/**
 * Border radius
 */
const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

/**
 * Shadows
 */
const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

/**
 * Complete theme interface
 */
export interface Theme {
  colors: typeof lightColors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  mode: 'light' | 'dark';
}

/**
 * Get theme based on color scheme
 */
export function getTheme(mode: 'light' | 'dark' | 'auto' = 'auto'): Theme {
  const systemScheme = useReactNativeColorScheme();
  const resolvedMode = mode === 'auto' ? systemScheme || 'light' : mode;

  return {
    colors: resolvedMode === 'dark' ? darkColors : lightColors,
    typography,
    spacing,
    borderRadius,
    shadows,
    mode: resolvedMode,
  };
}

/**
 * Theme utilities
 */
export const ThemeUtils = {
  /**
   * Get color with opacity
   */
  colorWithOpacity(color: string, opacity: number): string {
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  },

  /**
   * Darken a color
   */
  darken(color: string, percent: number = 10): string {
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - percent);
      const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - percent);
      const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - percent);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    return color;
  },

  /**
   * Lighten a color
   */
  lighten(color: string, percent: number = 10): string {
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + percent);
      const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + percent);
      const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + percent);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    return color;
  },

  /**
   * Get contrast color (black or white) based on background
   */
  getContrastColor(backgroundColor: string): '#000000' | '#FFFFFF' {
    if (backgroundColor.startsWith('#')) {
      const hex = backgroundColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }
    return '#000000';
  },
};

/**
 * Theme persistence
 */
const THEME_STORAGE_KEY = '@fisioflow_theme';

export const ThemePersistence = {
  async saveTheme(mode: 'light' | 'dark' | 'auto'): Promise<void> {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  },

  async getTheme(): Promise<'light' | 'dark' | 'auto'> {
    const mode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    return (mode as 'light' | 'dark' | 'auto') || 'auto';
  },

  async clearTheme(): Promise<void> {
    await AsyncStorage.removeItem(THEME_STORAGE_KEY);
  },
};

export default getTheme;
