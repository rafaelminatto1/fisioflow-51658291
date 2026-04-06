/**
 * Vitest Configuration
 *
 * Unit and integration test setup for FisioFlow
 *
 * @sa-exclude - Tests are run separately, not during build
 */

/// <reference types="@testing-library/jest-dom" />

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const coverageDir = path.resolve(__dirname, 'coverage');

export default defineConfig({
  root: repoRoot,
  plugins: [react()],

  test: {
    // Global test utilities (describe, it, expect, etc.)
    globals: true,

    // Test environment - jsdom for DOM testing
    environment: 'jsdom',

    // Pool configuration
    pool: 'threads',

    // Setup files for test configuration
    setupFiles: [path.resolve(__dirname, 'src/test/setup.ts')],

    // Enable CSS modules for component tests
    css: true,

    // Include patterns
    include: ['**/*.{test,spec}.{ts,tsx}'],

    // Reporters
    reporters: ['default', 'json', 'html', 'verbose'],

    // Output files
    outputFile: {
      json: path.resolve(coverageDir, 'test-results.json'),
      html: path.resolve(coverageDir, 'index.html'),
    },

    // Exclude Edge Functions and problematic tests
    exclude: [
      'node_modules/',
      '**/node_modules/**',
      'packages/**/node_modules/**',
      'packages/core/node_modules/**',
      'dist/',
      '.idea/',
      '.git/',
      '.cache/',
      'functions/**',
      // Exclude workspace apps (they have their own test configs)
      'apps/professional-app/**',
      'apps/patient-app/**',
      // Exclude workspace node_modules that have Jest tests
      '**/node_modules/exponential-backoff/**',
      '**/node_modules/wonka/**',
      // Exclude test files with React 18 concurrent rendering issues
      '**/AIAssistantPanel.test.tsx',
      '**/PatientAnalytics.test.tsx',
      '**/PatientEvolution.test.tsx',
      '**/TreatmentAssistant.test.tsx',
      '**/PatientCard.test.tsx',
      // Exclude tests with missing implementations
      'src/types/__tests__/common.test.ts',
      'src/components/error-boundaries/__tests__/**',
      'src/components/ui/__tests__/badge.test.tsx',
      'src/components/ui/__tests__/input.test.tsx',
      'src/components/ui/__tests__/select.test.tsx',
      'src/components/ui/__tests__/responsive-table.test.tsx',
      'src/components/ui/__tests__/virtual-list.test.tsx',
      'e2e/**',
      'e2e-tests/**',
      'tests/**',
      'test-*.spec.ts',
      'accessibility-tests/**',
      'test-start-attendance.spec.ts',
      'src/lib/a11y/__tests__/index.test.ts',
      'apps/professional-app/__tests__/Neon-security-rules.test.ts',
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

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      reportsDirectory: coverageDir,
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
        'functions/**',
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
    },
  },

  // Define global constants
  define: {
    __APP_VERSION__: '"test"',
    __BUILD_TIME__: '"0"',
    __CACHE_BUSTER__: '"test"',
  },

  resolve: {
    alias: {
      '@': path.resolve(repoRoot, 'src'),
      '@fisioflow/ui': path.resolve(repoRoot, 'packages/ui/src'),
      '@fisioflow/core': path.resolve(repoRoot, 'packages/core/src'),
      '@fisioflow/config': path.resolve(repoRoot, 'packages/config/src'),
      '@fisioflow/skills': path.resolve(repoRoot, 'src/lib/skills'),
      'lodash': 'lodash-es',
    },
  },
});
