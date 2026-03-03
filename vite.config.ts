
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
        "@fisioflow/ui": path.resolve(__dirname, "./packages/ui/src"),
        "@fisioflow/core": path.resolve(__dirname, "./packages/core/src"),
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
              // Extract base package name from node_modules path
              const match = id.match(/node_modules\/([^/]+)\//);
              const packageName = match ? match[1] : '';

              if (packageName.includes('react') || packageName.includes('scheduler')) {
                return 'react-core';
              }
              if (packageName.includes('firebase')) return 'firebase-vendor';
              
              if (packageName.includes('lucide-react')) return 'ui-icons';
              if (packageName.includes('@radix-ui')) return 'ui-radix';
              if (packageName.includes('framer-motion')) return 'motion';
              if (packageName.includes('recharts')) return 'charts';
              if (packageName.includes('react-grid-layout')) return 'grid-layout';
              
              // PDF e Excel (lazy load)
              if (packageName.includes('jspdf') || packageName.includes('@react-pdf')) return 'pdf-generator';
              if (packageName.includes('xlsx') || packageName.includes('exceljs')) return 'excel-generator';

              // Monitoring
              if (packageName.includes('sentry')) return 'sentry-vendor';

              // AI e ML
              if (packageName.includes('@google') || packageName.includes('openai') || packageName.includes('ai-sdk')) return 'ai-vendor';

              // Editor e Text
              if (packageName.includes('tiptap') || packageName.includes('prosemirror')) return 'editor-core';

              // WebGL e Computer Vision
              if (packageName.includes('mediapipe') || packageName.includes('three') || packageName.includes('konva')) return 'webgl-vendor';
            }
          }
        }
      }
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'framer-motion',
        'lucide-react',
        'react-router-dom',
        '@tanstack/react-query',
        '@dnd-kit/core',
        '@dnd-kit/sortable',
        '@dnd-kit/utilities',
        'fuse.js',
        'date-fns',
        'date-fns/locale'
      ],
    },
    server: {
      watch: {
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/*.log'],
      },
      ...(useFunctionsProxy
        ? {
          proxy: {
            '/functions': {
              target: 'http://127.0.0.1:5001/fisioflow-migration/southamerica-east1',
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/functions/, ''),
            },
          },
        }
        : {}),
    },
  };
});
