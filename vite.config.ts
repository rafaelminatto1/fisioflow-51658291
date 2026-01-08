import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    server: {
      host: "::",
      port: 8080,
      headers: {
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Cross-Origin-Opener-Policy": "same-origin",
      },
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
      VitePWA({
        registerType: 'autoUpdate',
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
          globIgnores: ['**/node_modules/**/*', '**/cornerstone-*', '**/*dicom-image-loader*'],
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
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          // Disable navigation preload to avoid issues with cornerstone
          navigationPreload: false,
        },
        // Disable injectManifest mode to avoid IIFE conflict with cornerstone
        injectManifest: undefined,
        // Don't include cornerstone in any PWA processing
        strategies: 'generateSW',
        devOptions: {
          enabled: false,
        },
        // Configure workbox to cache larger files
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
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
      minify: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
            'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'query-vendor': ['@tanstack/react-query'],
            'chart-vendor': ['recharts'],
            'date-vendor': ['date-fns'],
            'supabase': ['@supabase/supabase-js'],
            'cornerstone': ['@cornerstonejs/core', '@cornerstonejs/tools'],
            'mediapipe': ['@mediapipe/pose', '@mediapipe/drawing_utils', '@mediapipe/tasks-vision'],
            'konva': ['konva', 'react-konva'],
            'pdf': ['jspdf', 'jspdf-autotable', 'react-pdf', '@react-pdf/renderer'],
            'xlsx': ['xlsx'],
          },
        },
          },
      chunkSizeWarningLimit: 5000,
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
    },
  };
});
