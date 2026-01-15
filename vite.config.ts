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
        "Cross-Origin-Embedder-Policy": "credentialless",
        "Cross-Origin-Opener-Policy": "same-origin",
      },
      // Aumentar timeout do HMR para evitar desconexões em projetos grandes
      hmr: {
        timeout: 60000, // 60 segundos
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
      VitePWA({
        registerType: 'autoUpdate',
        // Disable PWA in development to avoid manifest errors
        disable: !isProduction,
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
          // Use a simple version format for PWA manifest
          version: '1.0.0',
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
          globIgnores: [
            '**/node_modules/**/*',
          ],
          // Don't cache cornerstone chunks to avoid 404s when hash changes
          navigateFallback: null,
          // Ativar SW imediatamente quando houver atualização
          skipWaiting: true,
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
        // Desabilitar mangle para evitar problemas de minificação com date-fns
        mangle: false,
        format: {
          comments: false,
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
              // Lucide icons
              if (id.includes('lucide-react')) {
                return 'icons-vendor';
              }
              // AI SDK
              if (id.includes('@ai-sdk') || id.includes('ai')) {
                return 'ai-vendor';
              }
              // Vercel SDKs
              if (id.includes('@vercel')) {
                return 'vercel-vendor';
              }
              // React PDF
              if (id.includes('react-pdf')) {
                return 'react-pdf-vendor';
              }
              // Sonner (toast)
              if (id.includes('sonner')) {
                return 'toast-vendor';
              }
              // Class variance authority
              if (id.includes('class-variance-authority') || id.includes('clsx') || id.includes('tailwind-merge')) {
                return 'cn-vendor';
              }
              // Cmdk (command palette)
              if (id.includes('cmdk')) {
                return 'cmdk-vendor';
              }
              // Embla carousel
              if (id.includes('embla-carousel')) {
                return 'carousel-vendor';
              }
              // React Dropzone
              if (id.includes('react-dropzone')) {
                return 'dropzone-vendor';
              }
              // React markdown
              if (id.includes('react-markdown')) {
                return 'markdown-vendor';
              }
              // UUID
              if (id.includes('uuid')) {
                return 'uuid-vendor';
              }
              // Recharts
              if (id.includes('recharts')) {
                return 'recharts-vendor';
              }
              // D3 (dependency of recharts)
              if (id.includes('d3-')) {
                return 'd3-vendor';
              }
              // Zustand
              if (id.includes('zustand')) {
                return 'zustand-vendor';
              }
              // Inngest
              if (id.includes('inngest')) {
                return 'inngest-vendor';
              }
              // Resend
              if (id.includes('resend')) {
                return 'resend-vendor';
              }
              // Sendgrid
              if (id.includes('@sendgrid')) {
                return 'sendgrid-vendor';
              }
              // Web vitals
              if (id.includes('web-vitals')) {
                return 'web-vitals-vendor';
              }
              // React error boundary
              if (id.includes('react-error-boundary')) {
                return 'error-boundary-vendor';
              }
              // Vaul drawer
              if (id.includes('vaul')) {
                return 'vaul-vendor';
              }
              // IDB keyval
              if (id.includes('idb-keyval')) {
                return 'idb-vendor';
              }
              // Outros node_modules
              return 'vendor';
            }
          },
          // Perfis modernos para melhor performance
          // Aumentado para reduzir uso de memória durante build e número de chunks
          experimentalMinChunkSize: 100000,
        },
        // Preservar nomes dos módulos para melhor debugging
        preserveEntrySignatures: 'strict',
      },
      chunkSizeWarningLimit: 2000,
      // Report de tamanho dos chunks
      reportCompressedSize: false,
      // Soucemaps em produção para debugging - desabilitado para reduzir memória no build
      sourcemap: false,
    },
    optimizeDeps: {
      // Evita re-otimizações contínuas que causam erro 504
      // Mas mantém descoberta automática para não quebrar imports
      holdUntilCrawlEnd: false,

      // Incluir dependências críticas que precisam ser pré-bundladas
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
        'lodash',

        // Include konva for proper CJS/UMD interop
        'konva',
        'react-konva',
      ],

      // Excluir bibliotecas médicas/visuais complexas que causam timeouts
      exclude: [
        '@cornerstonejs/dicom-image-loader',
        '@cornerstonejs/core',
        '@cornerstonejs/tools',
        '@cornerstonejs/codec-charls',
        '@cornerstonejs/codec-libjpeg-turbo-8bit',
        '@cornerstonejs/codec-openjpeg',
        '@cornerstonejs/codec-openjph',
        '@mediapipe/pose',
        '@mediapipe/tasks-vision',
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
