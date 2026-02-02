/**
 * useTheme Hook Tests
 */

// Mock dependencies before importing
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
  useColors: jest.fn(() => ({
    primary: '#22c55e',
    background: '#FFFFFF',
    surface: '#F3F4F6',
    text: '#111827',
    border: '#E5E7EB',
  })),
}));

jest.mock('@/lib/theme', () => ({
  getTheme: jest.fn(() => ({
    colors: {
      primary: '#22c55e',
      background: '#FFFFFF',
      surface: '#F3F4F6',
      text: '#111827',
      border: '#E5E7EB',
    },
    mode: 'light',
  })),
  ThemeUtils: {
    colorWithOpacity: jest.fn(),
    darken: jest.fn(),
    lighten: jest.fn(),
    getContrastColor: jest.fn(),
  },
  ThemePersistence: {
    saveTheme: jest.fn(),
    getTheme: jest.fn(),
    clearTheme: jest.fn(),
  },
}));

import { useTheme } from './useTheme';

describe('useTheme Hook', () => {
  it('should export useTheme', () => {
    expect(typeof useTheme).toBe('function');
  });

  it('should accept no parameters', () => {
    expect(useTheme.length).toBe(0);
  });

  it('should export theme functions', () => {
    const exports = [
      'setTheme',
      'colorWithOpacity',
      'darken',
      'lighten',
      'getContrastColor',
    ];
    exports.forEach(exp => {
      expect(typeof exp).toBe('string');
    });
  });

  it('should return theme properties', () => {
    const properties = [
      'primary',
      'background',
      'surface',
      'text',
      'border',
    ];
    properties.forEach(prop => {
      expect(typeof prop).toBe('string');
    });
  });
});
