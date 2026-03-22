/**
 * Test Setup
 * Configuration for Jest tests
 */


// Polyfill TextEncoder/TextDecoder for jsdom

import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Setup globals for jsdom-like environment
if (typeof window === 'undefined') {
  // Node environment - provide basic globals
  (global as any).window = global;
}

// Mock window.matchMedia
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Mock IntersectionObserver
if (typeof window !== 'undefined') {
  (global as any).IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  };
}

// Mock requestAnimationFrame
if (typeof window !== 'undefined') {
  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    return setTimeout(callback, 0) as unknown as number;
  };

  window.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };
}

// Suppress ResizeObserver warnings
if (typeof window !== 'undefined') {
  (global as any).ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  };
}

// Clean up after each test (this is handled by Jest's globals now)
// The afterEach hook is available globally in Jest
