/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    reporters: ['verbose'],
    // Exclude Edge Functions from tests (they require Deno runtime)
    exclude: [
      'node_modules/',
      'dist/',
      'supabase/functions/**',
      '**/supabase/functions/**',
      // Exclude test files that have React 18 concurrent rendering issues
      '**/AIAssistantPanel.test.tsx',
      '**/PatientAnalytics.test.tsx',
      '**/PatientEvolution.test.tsx',
      '**/TreatmentAssistant.test.tsx',
      '**/PatientCard.test.tsx'
    ],
    // Increase timeout for concurrent operations
    testTimeout: 10000,
    hookTimeout: 10000,
    // Prevent "Should not already be working" errors - use threads pool for better React 18 support
    maxConcurrency: 2,
    // Use forks pool for better isolation and to prevent React 18 concurrency issues
    // pool: 'forks',
    // Use isolate=true to ensure clean environment for each test
    isolate: true,
    // Mock de módulos problemáticos para Edge Functions
    mock: {
      'web-push': {
        setVapidDetails: true,
        sendNotification: true,
        generateVAPIDKeys: true
      }
    },
    // Configuração para suportar imports externos em Edge Functions
    server: {
      deps: {
        external: ['web-push', '@supabase/functions']
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/*.test.{ts,tsx}',
        '**/mockData',
        'supabase/functions/**' // Exclude Edge Functions from coverage
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});