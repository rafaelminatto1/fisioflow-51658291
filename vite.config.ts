import { sentryVitePlugin } from '@sentry/vite-plugin';
import { defineConfig } from 'vite';
// Utilizando o plugin oficial que no Vite 8 tira vantagem do parser OXC nativo (eliminando o aviso do esbuild/SWC)
import react from '@vitejs/plugin-react';
import path from 'path';

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
  const VERSION_SUFFIX = '-v2.5.0-vite8';
  const appVersion = (process.env.GIT_COMMIT_SHA || process.env.VITE_APP_VERSION || buildTime) + VERSION_SUFFIX;

  return {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __BUILD_TIME__: JSON.stringify(buildTime),
    },
    plugins: [
      react(),
      mockMobileModules(),
      htmlPlugin(appVersion, buildTime),
      isProduction && process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
        org: "fisioflow",
        project: "fisioflow-web",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
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
      // Rolldown nativo do Vite 8 com code splitting agressivo para reduzir LCP
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'react-vendor',
                test: /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|framer-motion)[\\/]/,
                priority: 30,
              },
              {
                name: 'pdf-generator',
                test: /[\\/]node_modules[\\/](jspdf|html2canvas|@react-pdf)[\\/]/,
                priority: 25,
              },
              {
                name: 'excel-vendor',
                test: /[\\/]node_modules[\\/]exceljs[\\/]/,
                priority: 25,
              },
              {
                name: 'dicom-vendor',
                test: /[\\/]node_modules[\\/](@cornerstonejs|dicom-parser)[\\/]/,
                priority: 25,
              },
              {
                name: 'canvas-vendor',
                test: /[\\/]node_modules[\\/](react-konva|konva)[\\/]/,
                priority: 20,
              },
              {
                name: 'ui-vendor',
                test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|date-fns)[\\/]/,
                priority: 15,
              }
            ],
          },
        },
      }
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'framer-motion',
        'react-router-dom',
        '@tanstack/react-query',
        '@dnd-kit/core',
        '@dnd-kit/sortable',
        '@dnd-kit/utilities',
        'date-fns',
      ],
      // Módulos IIFE/UMD: não pré-bundlar (side-effect imports no código-fonte)
      exclude: [
        '@mediapipe/drawing_utils',
        '@mediapipe/pose',
      ],
    },
    server: {
      watch: {
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/*.log'],
      },
    },
  };
});
