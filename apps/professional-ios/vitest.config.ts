/**
 * Vitest Configuration for Professional iOS App
 * 
 * Test configuration for React Native/Expo app with property-based testing support
 */

/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Global test utilities
    globals: true,

    // Use node environment for React Native tests
    environment: 'node',

    // Pool configuration
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },

    // Include patterns
    include: ['**/*.{test,spec}.{ts,tsx}'],

    // Exclude patterns
    exclude: [
      'node_modules/',
      'dist/',
      'android/',
      'ios/',
      '.expo/',
    ],

    // Reporters
    reporters: ['default', 'verbose'],

    // Test timeouts (longer for property-based tests)
    testTimeout: 120000, // 2 minutes for PBT tests
    hookTimeout: 30000,

    // Concurrency settings
    maxConcurrency: 2,

    // Test isolation
    isolate: true,

    // Watch mode
    watch: false,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.{ts,tsx}', 'store/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
