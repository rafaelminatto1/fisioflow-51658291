import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

// Plugin para substituir placeholders no HTML
function htmlPlugin(appVersion: string, buildTime: string): any {
  return {
    name: 'html-transform',
    transformIndexHtml(html: string) {
      return html
        .replace(/%APP_VERSION%/g, appVersion)
        .replace(/%BUILD_TIME%/g, buildTime);
    }
  };
}

// Plugin para excluir MSW do bundle de produção para evitar conflitos de dependência
function excludeMswPlugin() {
  return {
    name: 'exclude-msw',
    resolveId(id: string) {
      // Exclui MSW e módulos relacionados da build de produção
      if (id.includes('msw') || id.includes('@mswjs') || id.includes('graphql/jsutils/isObjectLike')) {
        return {
          id: id,
          external: false,
          moduleSideEffects: false
        };
      }
    },
    load(id: string) {
      if (id.includes('msw') || id.includes('@mswjs') || id.includes('graphql/jsutils/isObjectLike')) {
        // Retorna um módulo vazio
        return 'export default {};';
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isAnalyze = process.env.ANALYZE === 'true';

  // Gerar versão única para cada build
  const buildTime = Date.now().toString();
  const appVersion = process.env.VERCEL_GIT_COMMIT_SHA || buildTime;

  return {
    server: {
      host: "::",
      port: 8080,
      headers: {
        "Cross-Origin-Embedder-Policy": "credentialless",
        "Cross-Origin-Opener-Policy": "same-origin",
      },
      hmr: {
        timeout: 60000,
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __BUILD_TIME__: JSON.stringify(buildTime),
      __CACHE_BUSTER__: JSON.stringify(buildTime),
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
      htmlPlugin(appVersion, buildTime),
      isProduction && process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
        org: "fisioflow",
        project: "fisioflow-web",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
      isAnalyze && visualizer({
        filename: './dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
      VitePWA({
        registerType: 'prompt',
        disable: !isProduction,
        includeAssets: ['icons/*.svg', 'icons/*.png', 'favicon.ico'],
        manifest: {
          name: 'FisioFlow - Sistema de Gestão',
          short_name: 'FisioFlow',
          description: 'Sistema completo de gestão para clínica de fisioterapia e eventos',
          theme_color: '#0EA5E9',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/icons/icon-192x192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: '/icons/icon-512x512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ],
          categories: ['health', 'medical', 'productivity'],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
          globIgnores: ['**/node_modules/**/*'],
          navigateFallback: null,
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          cacheId: `fisioflow-v${appVersion}`,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 2592000 }
              }
            }
          ],
          navigationPreload: false,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        strategies: 'generateSW',
      }),
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240,
      }),
      isProduction && excludeMswPlugin(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "lodash": "lodash-es",
        // Allow importing legacy module from react-grid-layout
        "react-grid-layout/dist/legacy": path.resolve(__dirname, "./node_modules/react-grid-layout/dist/legacy.mjs"),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'esnext',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : [],
        },
        mangle: false, // Necessário para evitar quebras em bibliotecas sensíveis a nomes de classe
        format: {
          comments: false,
        },
      },
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // Agrupamento mais granular para melhor caching
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'react-vendor';
              if (id.includes('@supabase')) return 'supabase-vendor';
              if (id.includes('@tanstack/react-query')) return 'query-vendor';
              if (id.includes('@radix-ui')) return 'ui-vendor';
              if (id.includes('recharts')) return 'chart-vendor';
              if (id.includes('date-fns')) return 'date-vendor';
              if (id.includes('framer-motion')) return 'animation-vendor';
              if (id.includes('jspdf') || id.includes('@react-pdf')) return 'pdf-vendor';
              if (id.includes('xlsx')) return 'xlsx-vendor';
              if (id.includes('@cornerstonejs')) return 'cornerstone-vendor';
              if (id.includes('@mediapipe')) return 'mediapipe-vendor';
              if (id.includes('konva')) return 'konva-vendor';
              if (id.includes('lucide-react')) return 'icons-vendor';
              if (id.includes('zustand')) return 'zustand-vendor';
              return 'vendor';
            }
          },
          experimentalMinChunkSize: 100000,
        },
        preserveEntrySignatures: 'strict',
      },
      chunkSizeWarningLimit: 5000,
      reportCompressedSize: false,
      sourcemap: false,
    },
    optimizeDeps: {
      holdUntilCrawlEnd: false,
      include: [
        'react',
        'react-dom/client',
        'react-router-dom',
        '@supabase/supabase-js',
        '@tanstack/react-query',
        'date-fns',
        'zod',
        'framer-motion',
        'recharts',
        'lucide-react',
        'lodash-es', // Explicitamente usa lodash-es para otimização
        'konva',
        'react-konva',
        'react-grid-layout',
        'react-draggable',
        'react-resizable',
      ],
      exclude: [
        '@cornerstonejs/dicom-image-loader',
        '@cornerstonejs/core',
        '@cornerstonejs/tools',
        '@mediapipe/pose',
        '@mediapipe/tasks-vision',
        'msw',
      ],
    },
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
      charset: 'utf8',
    },
  };
});

