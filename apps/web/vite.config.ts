import { sentryVitePlugin } from '@sentry/vite-plugin';
import { defineConfig } from 'vite';
// Plugin oficial do React. Em Vite 8 + Rolldown, ele já usa o caminho Oxc por padrão.
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import tailwindcss from 'tailwindcss';

const repoRoot = path.resolve(__dirname, '../..');

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
  const exactModuleSet = new Set(mobileModules);

  return {
    name: 'mock-mobile-modules',
    resolveId(id: string) {
      if (exactModuleSet.has(id) || mobileModules.some(moduleName => id.startsWith(`${moduleName}/`))) {
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

function lazyCornerstoneCharls() {
  const lazyDecoderPath = path.resolve(
    repoRoot,
    'src/components/analysis/dicom/decoders/lazyDecodeJPEGLS.ts'
  );

  return {
    name: 'lazy-cornerstone-charls',
    enforce: 'pre' as const,
    resolveId(source: string, importer?: string) {
      if (!importer || !importer.includes('@cornerstonejs/dicom-image-loader')) {
        return null;
      }

      if (
        source === './decodeJPEGLS' ||
        source === './shared/decoders/decodeJPEGLS'
      ) {
        return lazyDecoderPath;
      }

      return null;
    },
  };
}

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isAnalyze = process.env.ANALYZE === 'true';
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
      lazyCornerstoneCharls(),
      htmlPlugin(appVersion, buildTime),
      isAnalyze && visualizer({
        filename: 'stats.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
        emitFile: true,
      }),
      isProduction && process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
        org: "fisioflow",
        project: "fisioflow-web",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
    ].filter(Boolean),
    resolve: {
      tsconfigPaths: true,
      dedupe: ['react', 'react-dom', 'framer-motion'],
      alias: {
        "@": path.resolve(repoRoot, 'src'),
        "lodash": "lodash-es",
        "@fisioflow/ui": path.resolve(repoRoot, 'packages/ui/src'),
        "@fisioflow/core": path.resolve(repoRoot, 'packages/core/src'),
        "@fisioflow/codec-charls-real": path.resolve(
          repoRoot,
          'node_modules/.pnpm/@cornerstonejs+codec-charls@1.2.3/node_modules/@cornerstonejs/codec-charls/dist/charlswasm_decode.js'
        ),
        "@fisioflow/codec-charls-wasm": path.resolve(
          repoRoot,
          'node_modules/.pnpm/@cornerstonejs+codec-charls@1.2.3/node_modules/@cornerstonejs/codec-charls/dist/charlswasm_decode.wasm'
        ),
        "@fisioflow/skills": path.resolve(repoRoot, 'src/lib/skills'),
        "react-grid-layout/dist/legacy": path.resolve(repoRoot, 'node_modules/react-grid-layout/dist/legacy.mjs'),
        "globalthis": path.resolve(repoRoot, 'src/lib/globalthis-shim.ts'),
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
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
                name: 'react-pdf-vendor',
                test: /[\\/]node_modules[\\/]@react-pdf[\\/]/,
                priority: 25,
              },
              {
                name: 'jspdf-vendor',
                test: /[\\/]node_modules[\\/](jspdf|jspdf-autotable)[\\/]/,
                priority: 25,
              },
              {
                name: 'html2canvas-vendor',
                test: /[\\/]node_modules[\\/]html2canvas[\\/]/,
                priority: 25,
              },
              {
                name: 'query-vendor',
                test: /[\\/]node_modules[\\/](?:@tanstack[\\/](?:react-query|query-core|query-persist-client|query-async-storage-persister)|idb-keyval)[\\/]/,
                priority: 24,
              },
              {
                name: 'observability-vendor',
                test: /[\\/]node_modules[\\/](?:@sentry|posthog-js)[\\/]/,
                priority: 24,
              },
              {
                name: 'charts-vendor',
                test: /[\\/]node_modules[\\/]recharts[\\/]/,
                priority: 22,
              },
              {
                name: 'excel-vendor',
                test: /[\\/]node_modules[\\/]exceljs[\\/]/,
                priority: 25,
              },
              {
                name: 'charls-vendor',
                test: /[\\/]node_modules[\\/]@cornerstonejs[\\/]codec-charls[\\/]/,
                priority: 27,
              },
              {
                name: 'vtk-vendor',
                test: /[\\/]node_modules[\\/]@kitware[\\/]vtk\.js[\\/]/,
                priority: 26,
              },
              {
                name: 'cornerstone-vendor',
                test: /[\\/]node_modules[\\/]@cornerstonejs[\\/]/,
                priority: 25,
              },
              {
                name: 'dicom-parser-vendor',
                test: /[\\/]node_modules[\\/]dicom-parser[\\/]/,
                priority: 25,
              },
              {
                name: 'canvas-vendor',
                test: /[\\/]node_modules[\\/](react-konva|konva)[\\/]/,
                priority: 20,
              },
              {
                name: 'ui-vendor',
                test: /[\\/]node_modules[\\/](@radix-ui|date-fns)[\\/]/,
                priority: 15,
              },
              {
                name: 'biomechanics-studios',
                test: /[\\/]src[\\/]components[\\/]analysis[\\/](studios|panels|canvas)[\\/]|[\\/]src[\\/]hooks[\\/]biomechanics[\\/]/,
                priority: 25,
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
    css: {
      postcss: {
        plugins: [
          tailwindcss({ config: path.resolve(__dirname, 'tailwind.config.ts') }),
          autoprefixer(),
        ],
      },
    },
    server: {
      forwardConsole: process.env.VITE_FORWARD_CONSOLE === 'true',
      fs: {
        allow: [repoRoot],
      },
      watch: {
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/*.log'],
      },
    },
  };
});
