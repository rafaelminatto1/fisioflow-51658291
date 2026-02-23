/**
 * Jest Setup File (CommonJS)
 */

// Mock console
global.console.warn = jest.fn();
global.console.error = jest.fn();

// Clear mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Mock @expo/vector-icons before react-native imports
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: ({ name, size, color, ...props }) =>
      React.createElement('Ionicons', { name, size, color, ...props }),
    FontAwesome: ({ name, size, color, ...props }) =>
      React.createElement('FontAwesome', { name, size, color, ...props }),
    MaterialIcons: ({ name, size, color, ...props }) =>
      React.createElement('MaterialIcons', { name, size, color, ...props }),
  };
});

// Mock expo-modules-core
jest.mock('expo-modules-core', () => ({
  EventEmitter: class MockEventEmitter {
    addListener() {}
    removeListener() {}
  },
  NativeModules: {},
  NativeModulesProxy: {},
  Platform: { OS: 'ios' },
  requireNativeModule: () => ({}),
  requireOptionalNativeModule: () => (null),
}));

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  auth: {},
  db: {},
}));

// Mock Sentry
jest.mock('@/lib/sentry', () => ({
  initSentry: jest.fn(),
  setSentryUser: jest.fn(),
  clearSentryUser: jest.fn(),
  captureException: jest.fn(),
  SentryErrorFallback: ({ children }) => children,
  withSentryErrorBoundary: (Component) => Component,
}));

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  authenticateAsync: jest.fn(() => ({ success: true })),
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1])),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
}));

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(() => ({
    uri: 'mock-uri.jpg',
    width: 100,
    height: 100,
  })),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() => ({
    cancelled: false,
    assets: [{ uri: 'mock-uri.jpg', width: 100, height: 100 }],
  })),
  MediaTypeOptions: {
    Images: 'Images',
    All: 'All',
  },
}));

// Mock Firebase auth and firestore
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

// Mock audit logger
jest.mock('@/lib/services/auditLogger', () => ({
  auditLogger: {
    logLogin: jest.fn(),
    logLogout: jest.fn(),
  },
}));
