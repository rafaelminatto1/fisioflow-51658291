/**
 * Jest Configuration - Manual setup to avoid ESM issues
 */

const config = {
  preset: 'jest-expo',

  setupFiles: [
    require.resolve('jest-expo/src/preset/setup.js'),
  ],

  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    './jest.setup.js',
  ],

  // Transform node_modules that use ESM
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|expo-modules-core|expo-font|@expo/vector-icons))/',
  ],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/*.stories.{js,jsx,ts,tsx}',
    '!**/*.test.{js,jsx,ts,tsx}',
    '!**/__tests__/**',
  ],

  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  testTimeout: 15000,

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  testPathIgnorePatterns: [
    '/node_modules/',
    '/.expo/',
    '/coverage/',
    '/tests/',
    '/e2e/',
  ],

  modulePathIgnorePatterns: [
    '<rootDir>/node_modules/.pnpm',
  ],

  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
};

module.exports = config;
