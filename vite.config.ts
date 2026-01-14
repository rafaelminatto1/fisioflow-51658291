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

// https://vitejs.dev/config/
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
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Cross-Origin-Opener-Policy": "same-origin",
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
      // Substituir placeholders no HTML
      htmlPlugin(appVersion, buildTime),
      isProduction && sentryVitePlugin({
        org: "fisioflow",
        project: "fisioflow-web",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
      // Bundle analyzer - gera relatório visual dos chunks
      isAnalyze && visualizer({
        filename: './dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
      // Gzip compression para assets
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240, // Apenas arquivos > 10KB
      }),
      // Brotli compression (melhor que gzip)
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240,
      }),
      VitePWA({
        registerType: 'autoUpdate',
        // Versão dinâmica baseada no commit SHA ou timestamp para forçar atualização
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
          // Versão dinâmica do manifest - força atualização do PWA
          version: appVersion,
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
          globIgnores: [
            '**/node_modules/**/*',
          ],
          // Don't cache cornerstone chunks to avoid 404s when hash changes
          navigateFallback: null,
          // NÃO usar skipWaiting automático - deixar o app controlar
          skipWaiting: false,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          // Cache ID dinâmico para forçar invalidação
          cacheId: `fisioflow-v${appVersion}`,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 5 * 60,
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                }
              }
            }
          ],
          // Disable navigation preload to avoid issues with cornerstone
          navigationPreload: false,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        },
        // Usar generateSW com configuração customizada
        strategies: 'generateSW',
        devOptions: {
          enabled: false,
        },
      })
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
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
      },
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          // Nomes de arquivo mais legíveis para debug
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
          // Divisão manual de chunks para melhor cache
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              // React core
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'react-vendor';
              }
              // Supabase
              if (id.includes('@supabase')) {
                return 'supabase-vendor';
              }
              // TanStack Query
              if (id.includes('@tanstack/react-query')) {
                return 'query-vendor';
              }
              // Radix UI
              if (id.includes('@radix-ui')) {
                return 'ui-vendor';
              }
              // Charts
              if (id.includes('recharts')) {
                return 'chart-vendor';
              }
              // Date utilities
              if (id.includes('date-fns')) {
                return 'date-vendor';
              }
              // Forms
              if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
                return 'form-vendor';
              }
              // Framer Motion
              if (id.includes('framer-motion')) {
                return 'animation-vendor';
              }
              // PDF libraries - lazy loaded
              if (id.includes('jspdf') || id.includes('@react-pdf')) {
                return 'pdf-vendor';
              }
              // XLSX - lazy loaded
              if (id.includes('xlsx')) {
                return 'xlsx-vendor';
              }
              // Cornerstone - lazy loaded (medical imaging)
              if (id.includes('@cornerstonejs')) {
                return 'cornerstone-vendor';
              }
              // MediaPipe - lazy loaded (computer vision)
              if (id.includes('@mediapipe')) {
                return 'mediapipe-vendor';
              }
              // Konva - lazy loaded (canvas)
              if (id.includes('konva')) {
                return 'konva-vendor';
              }
              // Outros node_modules
              return 'vendor';
            }
          },
          // Perfis modernos para melhor performance
          experimentalMinChunkSize: 10000,
        },
        // Preservar nomes dos módulos para melhor debugging
        preserveEntrySignatures: 'strict',
      },
      chunkSizeWarningLimit: 2000,
      // Report de tamanho dos chunks
      reportCompressedSize: false,
      // Soucemaps em produção para debugging
      sourcemap: isProduction ? false : true,
    },
    optimizeDeps: {
      exclude: [
        '@cornerstonejs/dicom-image-loader',
        '@cornerstonejs/core',
        '@cornerstonejs/tools',
        '@cornerstonejs/codec-charls',
        '@cornerstonejs/codec-libjpeg-turbo-8bit',
        '@cornerstonejs/codec-openjpeg',
        '@cornerstonejs/codec-openjph',
      ],
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        '@tanstack/react-query',
        'date-fns',
        'zod',
        'recharts'
      ],
    },
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
      // Log charset
      charset: 'utf8',
      // JSX import source
      jsxImportSource: undefined,
    },
  };
});
