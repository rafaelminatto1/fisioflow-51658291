
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
      if (mobileModules.some(m => id === m || id.includes(m))) {
        return { id: '/virtual-mobile-stub', external: false };
      }
    },
    load(id: string) {
      if (id === '/virtual-mobile-stub') {
        return 'export default {}; export const Platform = { OS: "web" }; export const AsyncStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };';
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const buildTime = Date.now().toString();
  const VERSION_SUFFIX = '-v2.4.5-react-core-fix';
  const appVersion = (process.env.GIT_COMMIT_SHA || process.env.VITE_APP_VERSION || buildTime) + VERSION_SUFFIX;

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
      dedupe: ['react', 'react-dom', 'framer-motion'],
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "lodash": "lodash-es",
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
              // Extract base package name from node_modules path (handles pnpm structure)
              const parts = id.split('node_modules/');
              const lastPart = parts[parts.length - 1];
              const packageName = lastPart.startsWith('@') 
                ? lastPart.split('/').slice(0, 2).join('/') 
                : lastPart.split('/')[0];

              // React core and its common ecosystem MUST be in the same chunk
              // to avoid "Cannot read properties of undefined (reading 'forwardRef')" errors
              if (packageName.includes('lucide-react')) return 'icons';
              if (packageName.includes('react-grid-layout')) return 'grid-layout';
              if (packageName.includes('react-day-picker')) return 'date-ui';
              if (packageName.includes('react-konva') || packageName.includes('konva')) return 'canvas-vendor';
              
              if (packageName.includes('jspdf')) return 'pdf-generator';

              if (packageName === 'react' || 
                  packageName === 'react-dom' || 
                  packageName === 'scheduler' ||
                  packageName === 'react-router' ||
                  packageName === 'react-router-dom') {
                return 'react-lib';
              }
              if (packageName.includes('framer-motion')) return 'motion';
              if (packageName.includes('recharts')) return 'charts';
              
              // PDF segue em chunk dedicado.
              // Excel e libs de renderização pesada ficam com split automático do Rollup.
              // O agrupamento manual anterior gerava ciclos entre chunks.

              // Monitoring
              if (packageName.includes('sentry')) return 'sentry-vendor';

              // AI e ML
              if (packageName.includes('@google') || packageName.includes('openai') || packageName.includes('ai-sdk')) return 'ai-vendor';

              // WebGL / CV também ficam sem chunk manual para evitar referências circulares.
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
    },
  };
});
