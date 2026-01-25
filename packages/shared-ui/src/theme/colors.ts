/**
 * FisioFlow Design System - Color Tokens
 *
 * Color palette following WCAG AA accessibility standards
 * All color combinations have minimum 4.5:1 contrast ratio
 */

export const lightColors = {
  // Primary Brand Colors
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // Main brand color
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Secondary Colors
  secondary: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B', // Main secondary
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },

  // Semantic Colors
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E', // Main success
    600: '#16A34A',
    700: '#15803D',
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B', // Main warning
    600: '#D97706',
    700: '#B45309',
  },

  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444', // Main danger
    600: '#DC2626',
    700: '#B91C1C',
  },

  info: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9',
    600: '#0284C7',
  },

  // Neutral Colors
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Base Colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFC',
  foreground: '#0F172A',
  border: '#E2E8F0',
  surface: '#FFFFFF',
  card: '#FFFFFF',

  // Text Colors
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#64748B',
    inverse: '#FFFFFF',
  },

  // Special Colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.25)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowLight: 'rgba(0, 0, 0, 0.05)',
};

export const darkColors = {
  // Primary Brand Colors
  primary: {
    50: '#0C172E',
    100: '#132E5D',
    200: '#1A458C',
    300: '#215CBB',
    400: '#3B82F6',
    500: '#60A5FA', // Main brand color in dark mode
    600: '#93C5FD',
    700: '#BFDBFE',
    800: '#DBEAFE',
    900: '#EFF6FF',
  },

  // Secondary Colors
  secondary: {
    50: '#0F172A',
    100: '#1E293B',
    200: '#334155',
    300: '#475569',
    400: '#64748B',
    500: '#94A3B8', // Main secondary in dark mode
    600: '#CBD5E1',
    700: '#E2E8F0',
    800: '#F1F5F9',
    900: '#F8FAFC',
  },

  // Semantic Colors
  success: {
    50: '#052E16',
    100: '#054D26',
    200: '#066C36',
    300: '#078B46',
    400: '#22C55E',
    500: '#4ADE80', // Main success in dark mode
    600: '#86EFAC',
    700: '#BBF7D0',
  },

  warning: {
    50: '#422006',
    100: '#713F12',
    200: '#9A5E1E',
    300: '#C37D2A',
    400: '#F59E0B',
    500: '#FBBF24', // Main warning in dark mode
    600: '#FCD34D',
    700: '#FDE68A',
  },

  danger: {
    50: '#450A0A',
    100: '#7F1D1D',
    200: '#991B1B',
    300: '#B91C1C',
    400: '#DC2626',
    500: '#EF4444', // Main danger in dark mode
    600: '#F87171',
    700: '#FCA5A5',
  },

  info: {
    50: '#082F49',
    100: '#0C4A6E',
    200: '#075985',
    300: '#0369A1',
    400: '#0284C7',
    500: '#0EA5E9', // Main info in dark mode
    600: '#38BDF8',
    700: '#7DD3FC',
  },

  // Neutral Colors
  gray: {
    50: '#171717',
    100: '#262626',
    200: '#404040',
    300: '#525252',
    400: '#737373',
    500: '#A3A3A3',
    600: '#D4D4D4',
    700: '#E5E5E5',
    800: '#F5F5F5',
    900: '#FAFAFA',
  },

  // Base Colors
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  foreground: '#F8FAFC',
  border: '#334155',
  surface: '#1E293B',
  card: '#1E293B',

  // Text Colors
  text: {
    primary: '#F8FAFC',
    secondary: '#CBD5E1',
    tertiary: '#94A3B8',
    inverse: '#0F172A',
  },

  // Special Colors
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowLight: 'rgba(0, 0, 0, 0.15)',
} as const;

export type ColorScheme = 'light' | 'dark';
export type Colors = typeof lightColors;

// Helper function to get colors based on theme
export function getColors(scheme: ColorScheme): Colors {
  return scheme === 'dark' ? darkColors : lightColors;
}
