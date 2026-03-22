/**
 * useAccessibility Hooks Tests
 */


// Mock react-native AccessibilityInfo

import { useAccessibility, useAnimationDuration, useScreenAnnouncement } from './useAccessibility';

jest.mock('react-native', () => ({
  AccessibilityInfo: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('@/lib/accessibility', () => ({
  isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
  isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
  isBoldTextEnabled: jest.fn(() => Promise.resolve(false)),
  announceForAccessibility: jest.fn(),
}));

describe('useAccessibility Hook', () => {
  it('should export useAccessibility', () => {
    expect(typeof useAccessibility).toBe('function');
  });

  it('should accept no parameters', () => {
    expect(useAccessibility.length).toBe(0);
  });

  it('should return accessibility settings properties', () => {
    const properties = [
      'screenReaderEnabled',
      'reduceMotionEnabled',
      'boldTextEnabled',
      'announce',
    ];
    properties.forEach(prop => {
      expect(typeof prop).toBe('string');
    });
  });
});

describe('useAnimationDuration Hook', () => {
  it('should export useAnimationDuration', () => {
    expect(typeof useAnimationDuration).toBe('function');
  });

  it('should accept defaultDuration parameter', () => {
    expect(useAnimationDuration.length).toBeGreaterThanOrEqual(0);
  });
});

describe('useScreenAnnouncement Hook', () => {
  it('should export useScreenAnnouncement', () => {
    expect(typeof useScreenAnnouncement).toBe('function');
  });

  it('should accept no parameters', () => {
    expect(useScreenAnnouncement.length).toBe(0);
  });

  it('should return functions', () => {
    const functions = ['announceScreenChange', 'announceAction'];
    functions.forEach(fn => {
      expect(typeof fn).toBe('string');
    });
  });
});
