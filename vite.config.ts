
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
// import { componentTagger } from 'lovable-tagger';
import viteCompression from 'vite-plugin-compression';

function htmlPlugin(appVersion: string, buildTime: string): any {
  return {
    name: 'html-transform',
    apply: 'build',
    transformIndexHtml(html: string) {
      return html
        .replace(/%APP_VERSION%/g, appVersion)
        .replace(/%BUILD_TIME%/g, buildTime);
    }
  };
}

// Plugin para mockar módulos mobile-only
function mockMobileModules() {
  const mobileModules = [
    'expo-notifications',
    'expo-device',
    'expo-constants',
    'expo-application',
    'react-native',
    '@react-native-async-storage/async-storage',
    '@react-native-community/netinfo',
    'react-native-toast-message',
  ];

  return {
    name: 'mock-mobile-modules',
    resolveId(id: string) {
      if (id === '@firebase/crashlytics') {
        return { id: '\0virtual-crashlytics-stub', external: false };
      }
      if (mobileModules.some(m => id === m || id.includes(m))) {
        return { id: '/virtual-mobile-stub', external: false };
      }
    },
    load(id: string) {
      if (id === '\0virtual-crashlytics-stub') {
        return 'export function getCrashlytics() { return {}; };';
      }
      if (id === '/virtual-mobile-stub') {
        return 'export default {}; export const Platform = { OS: "web" }; export const AsyncStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };';
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const buildTime = Date.now().toString();
  const VERSION_SUFFIX = '-v2.4.4-chunk-fix';
  const appVersion = (process.env.GIT_COMMIT_SHA || process.env.VITE_APP_VERSION || buildTime) + VERSION_SUFFIX;
  const useFunctionsProxy = process.env.VITE_USE_FUNCTIONS_PROXY === 'true';

  return {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __BUILD_TIME__: JSON.stringify(buildTime),
    },
    plugins: [
      react(),
      mockMobileModules(),
      // mode === 'development' && componentTagger(),
      htmlPlugin(appVersion, buildTime),
      isProduction && process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
        org: "fisioflow",
        project: "fisioflow-web",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
      viteCompression(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "lodash": "lodash-es",
        "@fisioflow/shared-api": path.resolve(__dirname, "./packages/shared-api/src"),
        "@fisioflow/shared-types": path.resolve(__dirname, "./packages/shared-types/src"),
        "@fisioflow/shared-constants": path.resolve(__dirname, "./packages/shared-constants/src"),
        "@fisioflow/shared-utils": path.resolve(__dirname, "./packages/shared-utils/src"),
        "@fisioflow/skills": path.resolve(__dirname, "./src/lib/skills"),
        "react-grid-layout/dist/legacy": path.resolve(__dirname, "./node_modules/react-grid-layout/dist/legacy.mjs"),
        "globalthis": path.resolve(__dirname, "./src/lib/globalthis-shim.ts"),
      },
    },
    build: {
      outDir: 'dist',
      target: 'es2020',
      cssTarget: 'es2020',
      sourcemap: true,
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // Core React
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                return 'react-core';
              }
              // Firebase bundle
              if (id.includes('firebase')) return 'firebase-vendor';

              // UI & Icons (Lucide é pesado)
              if (id.includes('lucide-react')) return 'ui-icons';
              if (id.includes('@radix-ui')) return 'ui-radix';
              if (id.includes('framer-motion')) return 'motion';

              // Utilitários grandes
              if (id.includes('date-fns')) return 'utils-date';
              if (id.includes('lodash')) return 'utils-lodash';
              if (id.includes('sentry')) return 'sentry-vendor';

              return 'vendor';
            }
          }
        }
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'framer-motion', 'lucide-react', 'react-router-dom', '@tanstack/react-query'],
    },
    ...(useFunctionsProxy
      ? {
        server: {
          proxy: {
            '/functions': {
              target: 'http://127.0.0.1:5001/fisioflow-migration/southamerica-east1',
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/functions/, ''),
            },
          },
        },
      }
      : {}),
  };
});
