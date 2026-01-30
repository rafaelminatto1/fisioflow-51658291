import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

// Plugin para substituir placeholders no HTML e garantir ordem de carregamento do React
function htmlPlugin(appVersion: string, buildTime: string, isProduction: boolean): any {
  return {
    name: 'html-transform',
    apply: 'build',
    transformIndexHtml(html: string) {
      // Primeiro substitui os placeholders
      let transformed = html
        .replace(/%APP_VERSION%/g, appVersion)
        .replace(/%BUILD_TIME%/g, buildTime);

      // Em produção, move react-vendor para ser o primeiro script carregado
      // Isso garante que o scheduler e outras dependências críticas do React estejam disponíveis
      // antes de outros vendors que dependem deles (como @radix-ui, framer-motion, etc)
      if (isProduction) {
        // Prioridade 1: React + scheduler (DEVE ser sempre o primeiro)
        const reactVendorMatch = transformed.match(/<script type="module"[^>]*src="\/assets\/js\/react-vendor-[^"]*"[^>]*><\/script>/);
        // Prioridade 2: React Router (depende de React)
        const routerVendorMatch = transformed.match(/<script type="module"[^>]*src="\/assets\/js\/router-vendor-[^"]*"[^>]*><\/script>/);
        // Prioridade 3: Query library (React Query depende de React)
        const queryVendorMatch = transformed.match(/<script type="module"[^>]*src="\/assets\/js\/query-vendor-[^"]*"[^>]*><\/script>/);
        // Prioridade 4: Supabase client (necessário para inicialização)
        const supabaseVendorMatch = transformed.match(/<script type="module"[^>]*src="\/assets\/js\/supabase-vendor-[^"]*"[^>]*><\/script>/);

        const priorityScripts: string[] = [];

        if (reactVendorMatch) {
          priorityScripts.push(reactVendorMatch[0]);
          transformed = transformed.replace(reactVendorMatch[0], '');
        }

        if (routerVendorMatch) {
          priorityScripts.push(routerVendorMatch[0]);
          transformed = transformed.replace(routerVendorMatch[0], '');
        }

        if (queryVendorMatch) {
          priorityScripts.push(queryVendorMatch[0]);
          transformed = transformed.replace(queryVendorMatch[0], '');
        }

        if (supabaseVendorMatch) {
          priorityScripts.push(supabaseVendorMatch[0]);
          transformed = transformed.replace(supabaseVendorMatch[0], '');
        }

        // Insere os scripts prioritários logo após o <head>, em ordem de dependência
        if (priorityScripts.length > 0) {
          const scriptsHtml = priorityScripts.join('\n    ');
          transformed = transformed.replace('<head>', `<head>\n    ${scriptsHtml}`);
        }
      }

      return transformed;
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
      port: 8083,
      strictPort: false, // Tenta portas alternativas se 8083 estiver em uso
      headers: {
        "Cross-Origin-Embedder-Policy": "credentialless",
        "Cross-Origin-Opener-Policy": "same-origin",
      },
      hmr: {
        timeout: 60000,
      },
      watch: {
        usePolling: true, // Melhor detecção de mudanças em alguns ambientes
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
      // htmlPlugin(appVersion, buildTime, isProduction),
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
        disable: true, // Temporarily disabled to fix cache issues
        includeAssets: ['icons/*.svg', 'icons/*.avif', 'favicon.ico'],
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
          globPatterns: ['**/*.{js,css,html,ico,avif,svg,json,woff2}'],
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
              urlPattern: /\.(?:avif|svg|gif)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 2592000 }
              }
            }
          ],
          navigationPreload: false,
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        },
        strategies: 'generateSW',
      }),
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240,
        filter: (file) => {
          // Only compress files inside dist, not the absolute path
          return file.includes('/dist/') || file.includes('\\dist\\');
        },
      }),
      isProduction && excludeMswPlugin(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "lodash": "lodash-es",
        // Workspace packages - point to src since Vite aliases don't respect package.json exports
        "@fisioflow/shared-api": path.resolve(__dirname, "./packages/shared-api/src"),
        "@fisioflow/shared-types": path.resolve(__dirname, "./packages/shared-types/src"),
        "@fisioflow/shared-constants": path.resolve(__dirname, "./packages/shared-constants/src"),
        "@fisioflow/shared-utils": path.resolve(__dirname, "./packages/shared-utils/src"),
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
          /*
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // CRITICAL: React + Scheduler deve ser sempre o primeiro chunk carregado
              // Scheduler é necessário para React 18 funcionar corretamente
              if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
                return 'react-vendor';
              }
              // Router depende de React, carregar após
              if (id.includes('react-router')) {
                return 'router-vendor';
              }
              // Bibliotecas de consulta que dependem de React
              if (id.includes('@tanstack/react-query')) {
                return 'query-vendor';
              }
              // Supabase para inicialização
              if (id.includes('@supabase')) {
                return 'supabase-vendor';
              }
              // Componentes UI que dependem de React
              if (id.includes('@radix-ui') ||
                id.includes('class-variance-authority') ||
                id.includes('clsx') ||
                id.includes('tailwind-merge') ||
                id.includes('react-remove-scroll') ||
                id.includes('aria-hidden')) {
                return 'ui-vendor';
              }
              // Gráficos
              if (id.includes('recharts')) {
                return 'chart-vendor';
              }
              // Utilitários de data
              if (id.includes('date-fns')) {
                return 'date-vendor';
              }
              // Animações - pode ser lazy loaded
              if (id.includes('framer-motion') || id.includes('motion')) {
                return 'animation-vendor';
              }
              // Bibliotecas PDF
              if (id.includes('jspdf') || id.includes('@react-pdf')) {
                return 'pdf-vendor';
              }
              // Excel
              if (id.includes('xlsx')) {
                return 'xlsx-vendor';
              }
              // Cornerstone DICOM
              if (id.includes('@cornerstonejs')) {
                return 'cornerstone-vendor';
              }
              // MediaPipe
              if (id.includes('@mediapipe')) {
                return 'mediapipe-vendor';
              }
              // Konva canvas
              if (id.includes('konva')) {
                return 'konva-vendor';
              }
              // Ícones
              if (id.includes('lucide-react')) {
                return 'icons-vendor';
              }
              // State management
              if (id.includes('zustand')) {
                return 'zustand-vendor';
              }
              // Bibliotecas de drag & drop
              if (id.includes('@dnd-kit') || id.includes('@hello-pangea/dnd')) {
                return 'dnd-vendor';
              }
              // Demais dependências
              return 'vendor';
            }
          },
          */
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
        // React core - CRITICAL: deve ser sempre o primeiro
        'react',
        'react-dom/client',
        'scheduler',
        // React libraries que dependem do scheduler
        'react-router-dom',
        '@tanstack/react-query',
        // Bibliotecas UI que usam React hooks internamente
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-select',
        '@radix-ui/react-tabs',
        // Bibliotecas de animação que dependem de React
        'framer-motion',
        // Utilitários pesados que se beneficiam de pre-bundling
        'date-fns',
        'date-fns/locale', // Locale imports
        'zod',
        'recharts',
        'lucide-react',
        'lodash-es',
        // Bibliotecas gráficas
        'konva',
        'react-konva',
        'react-grid-layout',
        'react-draggable',
        'react-resizable',
        // Supabase

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

