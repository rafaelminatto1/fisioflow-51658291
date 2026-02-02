/**
 * Jest Configuration
 * React Native Testing Library setup
 */

module.exports = {
  preset: 'ts-jest',
  rootDir: '.',
  testEnvironment: 'jsdom',
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|expo|@expo|react-native-reanimated|react-native-gesture-handler|expo-router|@react-native-async-storage|@react-native-community|@tanstack|date-fns|zustand|firebase|@testing-library)/)',
  ],
  setupFiles: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/test/setup.ts',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
        babelConfig: {
          presets: ['babel-preset-expo'],
          plugins: ['react-native-reanimated/plugin'],
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'lib/**/*.{ts}',
    'services/**/*.{ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/test/**',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1',
    '^@hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
