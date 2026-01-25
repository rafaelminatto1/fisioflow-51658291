/**
 * FisioFlow Design System - Spacing Tokens
 *
 * Spacing scale based on 8pt grid system
 * All values are in pixels (scaled automatically on different devices)
 */

export const spacing = {
  // Base spacing scale (0.5rem increments)
  0: 0,
  0.5: 4,   // 0.25rem
  1: 8,     // 0.5rem
  1.5: 12,  // 0.75rem
  2: 16,    // 1rem
  2.5: 20,  // 1.25rem
  3: 24,    // 1.5rem
  3.5: 28,  // 1.75rem
  4: 32,    // 2rem
  5: 40,    // 2.5rem
  6: 48,    // 3rem
  7: 56,    // 3.5rem
  8: 64,    // 4rem
  9: 72,    // 4.5rem
  10: 80,   // 5rem
  12: 96,   // 6rem
  16: 128,  // 8rem
  20: 160,  // 10rem
  24: 192,  // 12rem
  32: 256,  // 16rem
  40: 320,  // 20rem
  48: 384,  // 24rem
  56: 448,  // 28rem
  64: 512,  // 32rem
} as const;

/**
 * Border Radius Tokens
 */
export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

/**
 * Shadow Tokens
 */
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  inner: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

/**
 * Z-Index Scale
 */
export const zIndex = {
  // Base
  base: 0,
  // Dropdown, sticky
  dropdown: 1000,
  sticky: 1020,
  // Fixed elements
  fixed: 1030,
  // Modal backdrop
  modalBackdrop: 1040,
  // Modal
  modal: 1050,
  // Popover, tooltip
  popover: 1060,
  tooltip: 1070,
  // Notifications
  notification: 1080,
  // Maximum
  max: 9999,
} as const;

/**
 * Container Sizes
 */
export const container = {
  padding: {
    screen: 16,
    card: 16,
    button: 14,
    input: 12,
  },
  maxWidth: {
    screen: '100%',
    card: 400,
    dialog: 560,
  },
} as const;

export type SpacingValue = keyof typeof spacing;
export type BorderRadiusValue = keyof typeof borderRadius;
export type ShadowValue = keyof typeof shadows;
