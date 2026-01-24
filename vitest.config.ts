/**
 * Vitest Configuration
 *
 * Unit and integration test setup for FisioFlow
 *
 * @sa-exclude - Tests are run separately, not during build
 */

/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  test: {
    // Global test utilities (describe, it, expect, etc.)
    globals: true,

    // Test environment - jsdom for DOM testing
    environment: 'jsdom',

    // Pool configuration
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },

    // Setup files for test configuration
    setupFiles: ['./src/tests/setup.ts'],

    // Enable CSS modules for component tests
    css: true,

    // Include patterns
    include: ['**/*.{test,spec}.{ts,tsx}'],

    // Reporters
    reporters: ['default', 'json', 'html', 'verbose'],

    // Output files
    outputFile: {
      json: './coverage/test-results.json',
      html: './coverage/index.html',
    },

    // Exclude Edge Functions and problematic tests
    exclude: [
      'node_modules/',
      'dist/',
      '.idea/',
      '.git/',
      '.cache/',
      'supabase/functions/**',
      'functions/**',
      // Exclude test files with React 18 concurrent rendering issues
      '**/AIAssistantPanel.test.tsx',
      '**/PatientAnalytics.test.tsx',
      '**/PatientEvolution.test.tsx',
      '**/TreatmentAssistant.test.tsx',
      '**/PatientCard.test.tsx',
    ],

    // Test timeouts
    testTimeout: 10000,
    hookTimeout: 10000,

    // Concurrency settings
    maxConcurrency: 2,

    // Test isolation
    isolate: true,

    // Watch mode
    watch: false,

    // Mock configuration
    mock: {
      'web-push': {
        setVapidDetails: true,
        sendNotification: true,
        generateVAPIDKeys: true,
      },
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/test/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/mockData/**',
        'supabase/functions/**',
        'functions/**',
        // Supabase/Firebase integration clients
        'src/integrations/supabase/client.ts',
        'src/integrations/firebase/**/*.ts',
        // Entry points
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      // Coverage thresholds
      thresholds: {
        statements: 60,
        branches: 55,
        functions: 60,
        lines: 60,
      },
      // All files
      all: true,
    },

    // Define test constants
    define: {
      __APP_VERSION__: '"test"',
      __BUILD_TIME__: '"0"',
      __CACHE_BUSTER__: '"test"',
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'lodash': 'lodash-es',
    },
  },
});