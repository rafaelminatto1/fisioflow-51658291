// vite.config.ts
import { sentryVitePlugin } from "file:///home/rafael/antigravity/fisioflow/fisioflow-51658291/node_modules/.pnpm/@sentry+vite-plugin@4.6.1/node_modules/@sentry/vite-plugin/dist/esm/index.mjs";
import { defineConfig } from "file:///home/rafael/antigravity/fisioflow/fisioflow-51658291/node_modules/.pnpm/vite@5.4.19_@types+node@22.19.3_lightningcss@1.31.1_terser@5.44.1/node_modules/vite/dist/node/index.js";
import react from "file:///home/rafael/antigravity/fisioflow/fisioflow-51658291/node_modules/.pnpm/@vitejs+plugin-react-swc@3.11.0_@swc+helpers@0.5.18_vite@5.4.19_@types+node@22.19.3_lightningcss@1.31.1_terser@5.44.1_/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///home/rafael/antigravity/fisioflow/fisioflow-51658291/node_modules/.pnpm/lovable-tagger@1.1.13_ts-node@10.9.1_@swc+core@1.15.10_@swc+helpers@0.5.18__@types+node@22.19_4jcoo2lacvjpud4ddxaht6qlhe/node_modules/lovable-tagger/dist/index.js";
import { visualizer } from "file:///home/rafael/antigravity/fisioflow/fisioflow-51658291/node_modules/.pnpm/rollup-plugin-visualizer@6.0.5_rolldown@1.0.0-beta.52_rollup@2.79.2/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import viteCompression from "file:///home/rafael/antigravity/fisioflow/fisioflow-51658291/node_modules/.pnpm/vite-plugin-compression@0.5.1_vite@5.4.19_@types+node@22.19.3_lightningcss@1.31.1_terser@5.44.1_/node_modules/vite-plugin-compression/dist/index.mjs";
var __vite_injected_original_dirname = "/home/rafael/antigravity/fisioflow/fisioflow-51658291";
function htmlPlugin(appVersion, buildTime, isProduction) {
  return {
    name: "html-transform",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(/%APP_VERSION%/g, appVersion).replace(/%BUILD_TIME%/g, buildTime);
    }
  };
}
function mockMobileModules() {
  const mobileModules = [
    "expo-notifications",
    "expo-device",
    "expo-constants",
    "expo-application",
    "react-native",
    "@react-native-async-storage/async-storage",
    "@react-native-community/netinfo",
    "react-native-toast-message"
  ];
  const crashlyticsStub = `
export function getCrashlytics(_app) {
  return {
    setCrashlyticsCollectionEnabled: async () => {},
    recordError: async () => {},
    setUserId: async () => {},
    setCustomKey: async () => {},
    log: async () => {},
  };
}
`;
  return {
    name: "mock-mobile-modules",
    resolveId(id) {
      if (id === "@firebase/crashlytics") {
        return { id: "\0virtual-crashlytics-stub", external: false };
      }
      if (mobileModules.some((m) => id === m || id.includes(m))) {
        return { id: "/virtual-mobile-stub", external: false };
      }
    },
    load(id) {
      if (id === "\0virtual-crashlytics-stub") {
        return crashlyticsStub;
      }
      if (id === "/virtual-mobile-stub") {
        return `
// Mobile modules stubs for web build
export const requestPermissionsAsync = async () => ({ granted: true, canAskAgain: true });
export const getExpoPushTokenAsync = async () => ({ data: 'mock-token' });
export const setNotificationHandler = () => {};
export const addNotificationReceivedListener = () => ({ remove: () => {} });
export const addNotificationResponseReceivedListener = () => ({ remove: () => {} });
export const removeNotificationSubscription = () => {};
export const scheduleNotificationAsync = async () => ({});
export const cancelScheduledNotificationAsync = async () => {};
export const getAllScheduledNotificationsAsync = async () => [];
export const getDevicePushTokenAsync = async () => ({ type: 'web', data: 'mock' });
export const getPermissionsAsync = async () => ({ granted: true, canAskAgain: true });
export const setNotificationChannelAsync = async () => {};
export const AndroidImportance = { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 };
export const dismissNotificationAsync = async () => {};
export const dismissAllNotificationsAsync = async () => {};
export const setBadgeCountAsync = async () => {};
export const getBadgeCountAsync = async () => 0;
export const cancelAllScheduledNotificationsAsync = async () => {};
export const SchedulableTriggerInputTypes = { CALENDAR: 'calendar' };
export const isDevice = false;
export const Constants = { executionEnvironment: 'WEB' };
export const Platform = { OS: 'web' };
export const AsyncStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
  clear: async () => {},
};
export const NetInfo = {
  fetch: async () => ({ isConnected: true, isInternetReachable: true }),
  addEventListener: () => ({ remove: () => {} }),
};
export default {};
`;
      }
    }
  };
}
function excludeMswPlugin() {
  return {
    name: "exclude-msw",
    resolveId(id) {
      if (id.includes("msw") || id.includes("@mswjs") || id.includes("graphql/jsutils/isObjectLike")) {
        return {
          id,
          external: false,
          moduleSideEffects: false
        };
      }
    },
    load(id) {
      if (id.includes("msw") || id.includes("@mswjs") || id.includes("graphql/jsutils/isObjectLike")) {
        return "export default {};";
      }
    }
  };
}
var vite_config_default = defineConfig(({ mode }) => {
  const isProduction = mode === "production";
  const isAnalyze = process.env.ANALYZE === "true";
  const buildTime = Date.now().toString();
  const appVersion = process.env.GIT_COMMIT_SHA || process.env.VITE_APP_VERSION || buildTime;
  return {
    server: {
      host: "::",
      port: 8084,
      strictPort: false,
      // Tenta portas alternativas se 8084 estiver em uso
      headers: {
        "Cross-Origin-Embedder-Policy": "credentialless",
        "Cross-Origin-Opener-Policy": "same-origin"
      },
      hmr: {
        timeout: 6e4
      },
      watch: {
        usePolling: true
        // Melhor detecção de mudanças em alguns ambientes
      }
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __BUILD_TIME__: JSON.stringify(buildTime),
      __CACHE_BUSTER__: JSON.stringify(buildTime)
    },
    plugins: [
      react(),
      mockMobileModules(),
      mode === "development" && componentTagger(),
      htmlPlugin(appVersion, buildTime, isProduction),
      isProduction && process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
        org: "fisioflow",
        project: "fisioflow-web",
        authToken: process.env.SENTRY_AUTH_TOKEN
      }),
      isAnalyze && visualizer({
        filename: "./dist/stats.html",
        open: true,
        gzipSize: true,
        brotliSize: true
      }),
      // Temporarily disabled VitePWA - it's interfering with script injection
      // VitePWA({
      //   registerType: 'prompt',
      //   disable: true, // Temporarily disabled to fix cache issues
      //   includeAssets: ['icons/*.svg', 'icons/*.avif', 'favicon.ico'],
      //   manifest: {
      //     name: 'FisioFlow - Sistema de Gestão',
      //     short_name: 'FisioFlow',
      //     description: 'Sistema completo de gestão para clínica de fisioterapia e eventos',
      //     theme_color: '#0EA5E9',
      //     background_color: '#ffffff',
      //     display: 'standalone',
      //     orientation: 'portrait',
      //     scope: '/',
      //     start_url: '/',
      //     icons: [
      //       {
      //         src: '/icons/icon-192x192.svg',
      //         sizes: '192x192',
      //         type: 'image/svg+xml',
      //         purpose: 'any maskable'
      //       },
      //       {
      //         src: '/icons/icon-512x512.svg',
      //         sizes: '512x512',
      //         type: 'image/svg+xml',
      //         purpose: 'any maskable'
      //       }
      //     ],
      //     categories: ['health', 'medical', 'productivity'],
      //   },
      //   workbox: {
      //     globPatterns: ['**/*.{js,css,html,ico,avif,svg,json,woff2}'],
      //     globIgnores: ['**/node_modules/**/*'],
      //     navigateFallback: null,
      //     skipWaiting: true,
      //     clientsClaim: true,
      //     cleanupOutdatedCaches: true,
      //     cacheId: `fisioflow-v${appVersion}`,
      //     runtimeCaching: [
      //       {
      //         urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      //         handler: 'CacheFirst',
      //         options: {
      //           cacheName: 'google-fonts-cache',
      //           expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
      //           cacheableResponse: { statuses: [0, 200] }
      //         }
      //       },
      //       {
      //         urlPattern: /\.(?:avif|svg|gif)$/,
      //         handler: 'CacheFirst',
      //         options: {
      //           cacheName: 'images-cache',
      //           expiration: { maxEntries: 100, maxAgeSeconds: 2592000 }
      //         }
      //       }
      //     ],
      //     navigationPreload: false,
      //     maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      //   },
      //   strategies: 'generateSW',
      // }),
      viteCompression({
        algorithm: "gzip",
        ext: ".gz",
        threshold: 10240,
        filter: (file) => {
          return file.includes("/dist/") || file.includes("\\dist\\");
        }
      }),
      isProduction && excludeMswPlugin()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src"),
        "lodash": "lodash-es",
        // Workspace packages - point to src since Vite aliases don't respect package.json exports
        "@fisioflow/shared-api": path.resolve(__vite_injected_original_dirname, "./packages/shared-api/src"),
        "@fisioflow/shared-types": path.resolve(__vite_injected_original_dirname, "./packages/shared-types/src"),
        "@fisioflow/shared-constants": path.resolve(__vite_injected_original_dirname, "./packages/shared-constants/src"),
        "@fisioflow/shared-utils": path.resolve(__vite_injected_original_dirname, "./packages/shared-utils/src"),
        // Allow importing legacy module from react-grid-layout
        "react-grid-layout/dist/legacy": path.resolve(__vite_injected_original_dirname, "./node_modules/react-grid-layout/dist/legacy.mjs")
      }
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      target: "esnext",
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ["console.log", "console.info", "console.debug"] : []
        },
        mangle: false,
        // Necessário para evitar quebras em bibliotecas sensíveis a nomes de classe
        format: {
          comments: false
        }
      },
      commonjsOptions: {
        transformMixedEsModules: true
      },
      rollupOptions: {
        input: {
          main: "./index.html"
        },
        output: {
          chunkFileNames: "assets/js/[name]-[hash].js",
          entryFileNames: "assets/js/[name]-[hash].js",
          assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
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
          experimentalMinChunkSize: 1e5
        },
        preserveEntrySignatures: "strict"
      },
      chunkSizeWarningLimit: 5e3,
      reportCompressedSize: false,
      sourcemap: true
    },
    optimizeDeps: {
      holdUntilCrawlEnd: false,
      include: [
        // React core - CRITICAL: deve ser sempre o primeiro
        "react",
        "react-dom/client",
        "scheduler",
        // React libraries que dependem do scheduler
        "react-router-dom",
        "@tanstack/react-query",
        // Firebase - CRITICAL: garantir single instance
        "firebase/app",
        "firebase/auth",
        "firebase/firestore",
        "firebase/functions",
        "firebase/storage",
        // Bibliotecas UI que usam React hooks internamente
        "@radix-ui/react-dialog",
        "@radix-ui/react-dropdown-menu",
        "@radix-ui/react-select",
        "@radix-ui/react-tabs",
        // Bibliotecas de animação que dependem de React
        "framer-motion",
        // Utilitários pesados que se beneficiam de pre-bundling
        "date-fns",
        "date-fns/locale",
        // Locale imports
        "zod",
        "recharts",
        "lucide-react",
        "lodash-es",
        // Bibliotecas gráficas
        "konva",
        "react-konva",
        "react-grid-layout",
        "react-draggable",
        "react-resizable"
      ],
      exclude: [
        "@cornerstonejs/dicom-image-loader",
        "@cornerstonejs/core",
        "@cornerstonejs/tools",
        "@mediapipe/pose",
        "@mediapipe/tasks-vision",
        "msw",
        // Exclude PDFKit from pre-bundling to avoid circular dependency issues
        // Rollup will handle it directly in the build
        "@react-pdf/pdfkit",
        "@react-pdf/renderer"
      ]
    },
    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
      charset: "utf8"
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9yYWZhZWwvYW50aWdyYXZpdHkvZmlzaW9mbG93L2Zpc2lvZmxvdy01MTY1ODI5MVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvcmFmYWVsL2FudGlncmF2aXR5L2Zpc2lvZmxvdy9maXNpb2Zsb3ctNTE2NTgyOTEvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvcmFmYWVsL2FudGlncmF2aXR5L2Zpc2lvZmxvdy9maXNpb2Zsb3ctNTE2NTgyOTEvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBzZW50cnlWaXRlUGx1Z2luIH0gZnJvbSBcIkBzZW50cnkvdml0ZS1wbHVnaW5cIjtcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0LXN3Y1wiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IGNvbXBvbmVudFRhZ2dlciB9IGZyb20gXCJsb3ZhYmxlLXRhZ2dlclwiO1xuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSc7XG5pbXBvcnQgeyB2aXN1YWxpemVyIH0gZnJvbSAncm9sbHVwLXBsdWdpbi12aXN1YWxpemVyJztcbmltcG9ydCB2aXRlQ29tcHJlc3Npb24gZnJvbSAndml0ZS1wbHVnaW4tY29tcHJlc3Npb24nO1xuXG4vLyBQbHVnaW4gcGFyYSBzdWJzdGl0dWlyIHBsYWNlaG9sZGVycyBubyBIVE1MXG4vLyBOb3RlOiBMZXQgVml0ZSBoYW5kbGUgYXV0b21hdGljIHNjcmlwdCBpbmplY3Rpb24sIHdlIGp1c3QgcmVwbGFjZSB2ZXJzaW9uIHBsYWNlaG9sZGVyc1xuZnVuY3Rpb24gaHRtbFBsdWdpbihhcHBWZXJzaW9uOiBzdHJpbmcsIGJ1aWxkVGltZTogc3RyaW5nLCBpc1Byb2R1Y3Rpb246IGJvb2xlYW4pOiBhbnkge1xuICByZXR1cm4ge1xuICAgIG5hbWU6ICdodG1sLXRyYW5zZm9ybScsXG4gICAgYXBwbHk6ICdidWlsZCcsXG4gICAgdHJhbnNmb3JtSW5kZXhIdG1sKGh0bWw6IHN0cmluZykge1xuICAgICAgLy8gU3Vic3RpdHVpIG9zIHBsYWNlaG9sZGVycyBkZSB2ZXJzXHUwMEUzbyBlIGJ1aWxkIHRpbWVcbiAgICAgIC8vIFZpdGUgd2lsbCBoYW5kbGUgdGhlIG1haW4gc2NyaXB0IHRhZyBpbmplY3Rpb25cbiAgICAgIHJldHVybiBodG1sXG4gICAgICAgIC5yZXBsYWNlKC8lQVBQX1ZFUlNJT04lL2csIGFwcFZlcnNpb24pXG4gICAgICAgIC5yZXBsYWNlKC8lQlVJTERfVElNRSUvZywgYnVpbGRUaW1lKTtcbiAgICB9XG4gIH07XG59XG5cbi8vIFBsdWdpbiBwYXJhIG1vY2thciBtXHUwMEYzZHVsb3MgbW9iaWxlLW9ubHkgZSBvcGNpb25haXMgKGV4cG8sIEBmaXJlYmFzZS9jcmFzaGx5dGljcylcbmZ1bmN0aW9uIG1vY2tNb2JpbGVNb2R1bGVzKCkge1xuICBjb25zdCBtb2JpbGVNb2R1bGVzID0gW1xuICAgICdleHBvLW5vdGlmaWNhdGlvbnMnLFxuICAgICdleHBvLWRldmljZScsXG4gICAgJ2V4cG8tY29uc3RhbnRzJyxcbiAgICAnZXhwby1hcHBsaWNhdGlvbicsXG4gICAgJ3JlYWN0LW5hdGl2ZScsXG4gICAgJ0ByZWFjdC1uYXRpdmUtYXN5bmMtc3RvcmFnZS9hc3luYy1zdG9yYWdlJyxcbiAgICAnQHJlYWN0LW5hdGl2ZS1jb21tdW5pdHkvbmV0aW5mbycsXG4gICAgJ3JlYWN0LW5hdGl2ZS10b2FzdC1tZXNzYWdlJyxcbiAgXTtcblxuICAvLyBDcmFzaGx5dGljcyBwb2RlIG5cdTAwRTNvIGVzdGFyIGluc3RhbGFkbyBvdSBcdTAwRTkgbW9iaWxlLWZpcnN0OyBzdHViIHBhcmEgYnVpbGQgd2ViXG4gIGNvbnN0IGNyYXNobHl0aWNzU3R1YiA9IGBcbmV4cG9ydCBmdW5jdGlvbiBnZXRDcmFzaGx5dGljcyhfYXBwKSB7XG4gIHJldHVybiB7XG4gICAgc2V0Q3Jhc2hseXRpY3NDb2xsZWN0aW9uRW5hYmxlZDogYXN5bmMgKCkgPT4ge30sXG4gICAgcmVjb3JkRXJyb3I6IGFzeW5jICgpID0+IHt9LFxuICAgIHNldFVzZXJJZDogYXN5bmMgKCkgPT4ge30sXG4gICAgc2V0Q3VzdG9tS2V5OiBhc3luYyAoKSA9PiB7fSxcbiAgICBsb2c6IGFzeW5jICgpID0+IHt9LFxuICB9O1xufVxuYDtcblxuICByZXR1cm4ge1xuICAgIG5hbWU6ICdtb2NrLW1vYmlsZS1tb2R1bGVzJyxcbiAgICByZXNvbHZlSWQoaWQ6IHN0cmluZykge1xuICAgICAgaWYgKGlkID09PSAnQGZpcmViYXNlL2NyYXNobHl0aWNzJykge1xuICAgICAgICByZXR1cm4geyBpZDogJ1xcMHZpcnR1YWwtY3Jhc2hseXRpY3Mtc3R1YicsIGV4dGVybmFsOiBmYWxzZSB9O1xuICAgICAgfVxuICAgICAgaWYgKG1vYmlsZU1vZHVsZXMuc29tZShtID0+IGlkID09PSBtIHx8IGlkLmluY2x1ZGVzKG0pKSkge1xuICAgICAgICByZXR1cm4geyBpZDogJy92aXJ0dWFsLW1vYmlsZS1zdHViJywgZXh0ZXJuYWw6IGZhbHNlIH07XG4gICAgICB9XG4gICAgfSxcbiAgICBsb2FkKGlkOiBzdHJpbmcpIHtcbiAgICAgIGlmIChpZCA9PT0gJ1xcMHZpcnR1YWwtY3Jhc2hseXRpY3Mtc3R1YicpIHtcbiAgICAgICAgcmV0dXJuIGNyYXNobHl0aWNzU3R1YjtcbiAgICAgIH1cbiAgICAgIGlmIChpZCA9PT0gJy92aXJ0dWFsLW1vYmlsZS1zdHViJykge1xuICAgICAgICByZXR1cm4gYFxuLy8gTW9iaWxlIG1vZHVsZXMgc3R1YnMgZm9yIHdlYiBidWlsZFxuZXhwb3J0IGNvbnN0IHJlcXVlc3RQZXJtaXNzaW9uc0FzeW5jID0gYXN5bmMgKCkgPT4gKHsgZ3JhbnRlZDogdHJ1ZSwgY2FuQXNrQWdhaW46IHRydWUgfSk7XG5leHBvcnQgY29uc3QgZ2V0RXhwb1B1c2hUb2tlbkFzeW5jID0gYXN5bmMgKCkgPT4gKHsgZGF0YTogJ21vY2stdG9rZW4nIH0pO1xuZXhwb3J0IGNvbnN0IHNldE5vdGlmaWNhdGlvbkhhbmRsZXIgPSAoKSA9PiB7fTtcbmV4cG9ydCBjb25zdCBhZGROb3RpZmljYXRpb25SZWNlaXZlZExpc3RlbmVyID0gKCkgPT4gKHsgcmVtb3ZlOiAoKSA9PiB7fSB9KTtcbmV4cG9ydCBjb25zdCBhZGROb3RpZmljYXRpb25SZXNwb25zZVJlY2VpdmVkTGlzdGVuZXIgPSAoKSA9PiAoeyByZW1vdmU6ICgpID0+IHt9IH0pO1xuZXhwb3J0IGNvbnN0IHJlbW92ZU5vdGlmaWNhdGlvblN1YnNjcmlwdGlvbiA9ICgpID0+IHt9O1xuZXhwb3J0IGNvbnN0IHNjaGVkdWxlTm90aWZpY2F0aW9uQXN5bmMgPSBhc3luYyAoKSA9PiAoe30pO1xuZXhwb3J0IGNvbnN0IGNhbmNlbFNjaGVkdWxlZE5vdGlmaWNhdGlvbkFzeW5jID0gYXN5bmMgKCkgPT4ge307XG5leHBvcnQgY29uc3QgZ2V0QWxsU2NoZWR1bGVkTm90aWZpY2F0aW9uc0FzeW5jID0gYXN5bmMgKCkgPT4gW107XG5leHBvcnQgY29uc3QgZ2V0RGV2aWNlUHVzaFRva2VuQXN5bmMgPSBhc3luYyAoKSA9PiAoeyB0eXBlOiAnd2ViJywgZGF0YTogJ21vY2snIH0pO1xuZXhwb3J0IGNvbnN0IGdldFBlcm1pc3Npb25zQXN5bmMgPSBhc3luYyAoKSA9PiAoeyBncmFudGVkOiB0cnVlLCBjYW5Bc2tBZ2FpbjogdHJ1ZSB9KTtcbmV4cG9ydCBjb25zdCBzZXROb3RpZmljYXRpb25DaGFubmVsQXN5bmMgPSBhc3luYyAoKSA9PiB7fTtcbmV4cG9ydCBjb25zdCBBbmRyb2lkSW1wb3J0YW5jZSA9IHsgTUFYOiA1LCBISUdIOiA0LCBERUZBVUxUOiAzLCBMT1c6IDIsIE1JTjogMSwgTk9ORTogMCB9O1xuZXhwb3J0IGNvbnN0IGRpc21pc3NOb3RpZmljYXRpb25Bc3luYyA9IGFzeW5jICgpID0+IHt9O1xuZXhwb3J0IGNvbnN0IGRpc21pc3NBbGxOb3RpZmljYXRpb25zQXN5bmMgPSBhc3luYyAoKSA9PiB7fTtcbmV4cG9ydCBjb25zdCBzZXRCYWRnZUNvdW50QXN5bmMgPSBhc3luYyAoKSA9PiB7fTtcbmV4cG9ydCBjb25zdCBnZXRCYWRnZUNvdW50QXN5bmMgPSBhc3luYyAoKSA9PiAwO1xuZXhwb3J0IGNvbnN0IGNhbmNlbEFsbFNjaGVkdWxlZE5vdGlmaWNhdGlvbnNBc3luYyA9IGFzeW5jICgpID0+IHt9O1xuZXhwb3J0IGNvbnN0IFNjaGVkdWxhYmxlVHJpZ2dlcklucHV0VHlwZXMgPSB7IENBTEVOREFSOiAnY2FsZW5kYXInIH07XG5leHBvcnQgY29uc3QgaXNEZXZpY2UgPSBmYWxzZTtcbmV4cG9ydCBjb25zdCBDb25zdGFudHMgPSB7IGV4ZWN1dGlvbkVudmlyb25tZW50OiAnV0VCJyB9O1xuZXhwb3J0IGNvbnN0IFBsYXRmb3JtID0geyBPUzogJ3dlYicgfTtcbmV4cG9ydCBjb25zdCBBc3luY1N0b3JhZ2UgPSB7XG4gIGdldEl0ZW06IGFzeW5jICgpID0+IG51bGwsXG4gIHNldEl0ZW06IGFzeW5jICgpID0+IHt9LFxuICByZW1vdmVJdGVtOiBhc3luYyAoKSA9PiB7fSxcbiAgY2xlYXI6IGFzeW5jICgpID0+IHt9LFxufTtcbmV4cG9ydCBjb25zdCBOZXRJbmZvID0ge1xuICBmZXRjaDogYXN5bmMgKCkgPT4gKHsgaXNDb25uZWN0ZWQ6IHRydWUsIGlzSW50ZXJuZXRSZWFjaGFibGU6IHRydWUgfSksXG4gIGFkZEV2ZW50TGlzdGVuZXI6ICgpID0+ICh7IHJlbW92ZTogKCkgPT4ge30gfSksXG59O1xuZXhwb3J0IGRlZmF1bHQge307XG5gO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cblxuLy8gUGx1Z2luIHBhcmEgZXhjbHVpciBNU1cgZG8gYnVuZGxlIGRlIHByb2R1XHUwMEU3XHUwMEUzbyBwYXJhIGV2aXRhciBjb25mbGl0b3MgZGUgZGVwZW5kXHUwMEVBbmNpYVxuZnVuY3Rpb24gZXhjbHVkZU1zd1BsdWdpbigpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnZXhjbHVkZS1tc3cnLFxuICAgIHJlc29sdmVJZChpZDogc3RyaW5nKSB7XG4gICAgICAvLyBFeGNsdWkgTVNXIGUgbVx1MDBGM2R1bG9zIHJlbGFjaW9uYWRvcyBkYSBidWlsZCBkZSBwcm9kdVx1MDBFN1x1MDBFM29cbiAgICAgIGlmIChpZC5pbmNsdWRlcygnbXN3JykgfHwgaWQuaW5jbHVkZXMoJ0Btc3dqcycpIHx8IGlkLmluY2x1ZGVzKCdncmFwaHFsL2pzdXRpbHMvaXNPYmplY3RMaWtlJykpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgZXh0ZXJuYWw6IGZhbHNlLFxuICAgICAgICAgIG1vZHVsZVNpZGVFZmZlY3RzOiBmYWxzZVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0sXG4gICAgbG9hZChpZDogc3RyaW5nKSB7XG4gICAgICBpZiAoaWQuaW5jbHVkZXMoJ21zdycpIHx8IGlkLmluY2x1ZGVzKCdAbXN3anMnKSB8fCBpZC5pbmNsdWRlcygnZ3JhcGhxbC9qc3V0aWxzL2lzT2JqZWN0TGlrZScpKSB7XG4gICAgICAgIC8vIFJldG9ybmEgdW0gbVx1MDBGM2R1bG8gdmF6aW9cbiAgICAgICAgcmV0dXJuICdleHBvcnQgZGVmYXVsdCB7fTsnO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICBjb25zdCBpc1Byb2R1Y3Rpb24gPSBtb2RlID09PSAncHJvZHVjdGlvbic7XG4gIGNvbnN0IGlzQW5hbHl6ZSA9IHByb2Nlc3MuZW52LkFOQUxZWkUgPT09ICd0cnVlJztcblxuICAvLyBHZXJhciB2ZXJzXHUwMEUzbyBcdTAwRkFuaWNhIHBhcmEgY2FkYSBidWlsZFxuICBjb25zdCBidWlsZFRpbWUgPSBEYXRlLm5vdygpLnRvU3RyaW5nKCk7XG4gIGNvbnN0IGFwcFZlcnNpb24gPSBwcm9jZXNzLmVudi5HSVRfQ09NTUlUX1NIQSB8fCBwcm9jZXNzLmVudi5WSVRFX0FQUF9WRVJTSU9OIHx8IGJ1aWxkVGltZTtcblxuICByZXR1cm4ge1xuICAgIHNlcnZlcjoge1xuICAgICAgaG9zdDogXCI6OlwiLFxuICAgICAgcG9ydDogODA4NCxcbiAgICAgIHN0cmljdFBvcnQ6IGZhbHNlLCAvLyBUZW50YSBwb3J0YXMgYWx0ZXJuYXRpdmFzIHNlIDgwODQgZXN0aXZlciBlbSB1c29cbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDcm9zcy1PcmlnaW4tRW1iZWRkZXItUG9saWN5XCI6IFwiY3JlZGVudGlhbGxlc3NcIixcbiAgICAgICAgXCJDcm9zcy1PcmlnaW4tT3BlbmVyLVBvbGljeVwiOiBcInNhbWUtb3JpZ2luXCIsXG4gICAgICB9LFxuICAgICAgaG1yOiB7XG4gICAgICAgIHRpbWVvdXQ6IDYwMDAwLFxuICAgICAgfSxcbiAgICAgIHdhdGNoOiB7XG4gICAgICAgIHVzZVBvbGxpbmc6IHRydWUsIC8vIE1lbGhvciBkZXRlY1x1MDBFN1x1MDBFM28gZGUgbXVkYW5cdTAwRTdhcyBlbSBhbGd1bnMgYW1iaWVudGVzXG4gICAgICB9LFxuICAgIH0sXG4gICAgZGVmaW5lOiB7XG4gICAgICBfX0FQUF9WRVJTSU9OX186IEpTT04uc3RyaW5naWZ5KGFwcFZlcnNpb24pLFxuICAgICAgX19CVUlMRF9USU1FX186IEpTT04uc3RyaW5naWZ5KGJ1aWxkVGltZSksXG4gICAgICBfX0NBQ0hFX0JVU1RFUl9fOiBKU09OLnN0cmluZ2lmeShidWlsZFRpbWUpLFxuICAgIH0sXG4gICAgcGx1Z2luczogW1xuICAgICAgcmVhY3QoKSxcbiAgICAgIG1vY2tNb2JpbGVNb2R1bGVzKCksXG4gICAgICBtb2RlID09PSAnZGV2ZWxvcG1lbnQnICYmIGNvbXBvbmVudFRhZ2dlcigpLFxuICAgICAgaHRtbFBsdWdpbihhcHBWZXJzaW9uLCBidWlsZFRpbWUsIGlzUHJvZHVjdGlvbiksXG4gICAgICBpc1Byb2R1Y3Rpb24gJiYgcHJvY2Vzcy5lbnYuU0VOVFJZX0FVVEhfVE9LRU4gJiYgc2VudHJ5Vml0ZVBsdWdpbih7XG4gICAgICAgIG9yZzogXCJmaXNpb2Zsb3dcIixcbiAgICAgICAgcHJvamVjdDogXCJmaXNpb2Zsb3ctd2ViXCIsXG4gICAgICAgIGF1dGhUb2tlbjogcHJvY2Vzcy5lbnYuU0VOVFJZX0FVVEhfVE9LRU4sXG4gICAgICB9KSxcbiAgICAgIGlzQW5hbHl6ZSAmJiB2aXN1YWxpemVyKHtcbiAgICAgICAgZmlsZW5hbWU6ICcuL2Rpc3Qvc3RhdHMuaHRtbCcsXG4gICAgICAgIG9wZW46IHRydWUsXG4gICAgICAgIGd6aXBTaXplOiB0cnVlLFxuICAgICAgICBicm90bGlTaXplOiB0cnVlLFxuICAgICAgfSksXG4gICAgICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlZCBWaXRlUFdBIC0gaXQncyBpbnRlcmZlcmluZyB3aXRoIHNjcmlwdCBpbmplY3Rpb25cbiAgICAgIC8vIFZpdGVQV0Eoe1xuICAgICAgLy8gICByZWdpc3RlclR5cGU6ICdwcm9tcHQnLFxuICAgICAgLy8gICBkaXNhYmxlOiB0cnVlLCAvLyBUZW1wb3JhcmlseSBkaXNhYmxlZCB0byBmaXggY2FjaGUgaXNzdWVzXG4gICAgICAvLyAgIGluY2x1ZGVBc3NldHM6IFsnaWNvbnMvKi5zdmcnLCAnaWNvbnMvKi5hdmlmJywgJ2Zhdmljb24uaWNvJ10sXG4gICAgICAvLyAgIG1hbmlmZXN0OiB7XG4gICAgICAvLyAgICAgbmFtZTogJ0Zpc2lvRmxvdyAtIFNpc3RlbWEgZGUgR2VzdFx1MDBFM28nLFxuICAgICAgLy8gICAgIHNob3J0X25hbWU6ICdGaXNpb0Zsb3cnLFxuICAgICAgLy8gICAgIGRlc2NyaXB0aW9uOiAnU2lzdGVtYSBjb21wbGV0byBkZSBnZXN0XHUwMEUzbyBwYXJhIGNsXHUwMEVEbmljYSBkZSBmaXNpb3RlcmFwaWEgZSBldmVudG9zJyxcbiAgICAgIC8vICAgICB0aGVtZV9jb2xvcjogJyMwRUE1RTknLFxuICAgICAgLy8gICAgIGJhY2tncm91bmRfY29sb3I6ICcjZmZmZmZmJyxcbiAgICAgIC8vICAgICBkaXNwbGF5OiAnc3RhbmRhbG9uZScsXG4gICAgICAvLyAgICAgb3JpZW50YXRpb246ICdwb3J0cmFpdCcsXG4gICAgICAvLyAgICAgc2NvcGU6ICcvJyxcbiAgICAgIC8vICAgICBzdGFydF91cmw6ICcvJyxcbiAgICAgIC8vICAgICBpY29uczogW1xuICAgICAgLy8gICAgICAge1xuICAgICAgLy8gICAgICAgICBzcmM6ICcvaWNvbnMvaWNvbi0xOTJ4MTkyLnN2ZycsXG4gICAgICAvLyAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXG4gICAgICAvLyAgICAgICAgIHR5cGU6ICdpbWFnZS9zdmcreG1sJyxcbiAgICAgIC8vICAgICAgICAgcHVycG9zZTogJ2FueSBtYXNrYWJsZSdcbiAgICAgIC8vICAgICAgIH0sXG4gICAgICAvLyAgICAgICB7XG4gICAgICAvLyAgICAgICAgIHNyYzogJy9pY29ucy9pY29uLTUxMng1MTIuc3ZnJyxcbiAgICAgIC8vICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcbiAgICAgIC8vICAgICAgICAgdHlwZTogJ2ltYWdlL3N2Zyt4bWwnLFxuICAgICAgLy8gICAgICAgICBwdXJwb3NlOiAnYW55IG1hc2thYmxlJ1xuICAgICAgLy8gICAgICAgfVxuICAgICAgLy8gICAgIF0sXG4gICAgICAvLyAgICAgY2F0ZWdvcmllczogWydoZWFsdGgnLCAnbWVkaWNhbCcsICdwcm9kdWN0aXZpdHknXSxcbiAgICAgIC8vICAgfSxcbiAgICAgIC8vICAgd29ya2JveDoge1xuICAgICAgLy8gICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxpY28sYXZpZixzdmcsanNvbix3b2ZmMn0nXSxcbiAgICAgIC8vICAgICBnbG9iSWdub3JlczogWycqKi9ub2RlX21vZHVsZXMvKiovKiddLFxuICAgICAgLy8gICAgIG5hdmlnYXRlRmFsbGJhY2s6IG51bGwsXG4gICAgICAvLyAgICAgc2tpcFdhaXRpbmc6IHRydWUsXG4gICAgICAvLyAgICAgY2xpZW50c0NsYWltOiB0cnVlLFxuICAgICAgLy8gICAgIGNsZWFudXBPdXRkYXRlZENhY2hlczogdHJ1ZSxcbiAgICAgIC8vICAgICBjYWNoZUlkOiBgZmlzaW9mbG93LXYke2FwcFZlcnNpb259YCxcbiAgICAgIC8vICAgICBydW50aW1lQ2FjaGluZzogW1xuICAgICAgLy8gICAgICAge1xuICAgICAgLy8gICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2ZvbnRzXFwuZ29vZ2xlYXBpc1xcLmNvbVxcLy4qL2ksXG4gICAgICAvLyAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcbiAgICAgIC8vICAgICAgICAgb3B0aW9uczoge1xuICAgICAgLy8gICAgICAgICAgIGNhY2hlTmFtZTogJ2dvb2dsZS1mb250cy1jYWNoZScsXG4gICAgICAvLyAgICAgICAgICAgZXhwaXJhdGlvbjogeyBtYXhFbnRyaWVzOiAxMCwgbWF4QWdlU2Vjb25kczogMzE1MzYwMDAgfSxcbiAgICAgIC8vICAgICAgICAgICBjYWNoZWFibGVSZXNwb25zZTogeyBzdGF0dXNlczogWzAsIDIwMF0gfVxuICAgICAgLy8gICAgICAgICB9XG4gICAgICAvLyAgICAgICB9LFxuICAgICAgLy8gICAgICAge1xuICAgICAgLy8gICAgICAgICB1cmxQYXR0ZXJuOiAvXFwuKD86YXZpZnxzdmd8Z2lmKSQvLFxuICAgICAgLy8gICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXG4gICAgICAvLyAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgIC8vICAgICAgICAgICBjYWNoZU5hbWU6ICdpbWFnZXMtY2FjaGUnLFxuICAgICAgLy8gICAgICAgICAgIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogMTAwLCBtYXhBZ2VTZWNvbmRzOiAyNTkyMDAwIH1cbiAgICAgIC8vICAgICAgICAgfVxuICAgICAgLy8gICAgICAgfVxuICAgICAgLy8gICAgIF0sXG4gICAgICAvLyAgICAgbmF2aWdhdGlvblByZWxvYWQ6IGZhbHNlLFxuICAgICAgLy8gICAgIG1heGltdW1GaWxlU2l6ZVRvQ2FjaGVJbkJ5dGVzOiA4ICogMTAyNCAqIDEwMjQsXG4gICAgICAvLyAgIH0sXG4gICAgICAvLyAgIHN0cmF0ZWdpZXM6ICdnZW5lcmF0ZVNXJyxcbiAgICAgIC8vIH0pLFxuICAgICAgdml0ZUNvbXByZXNzaW9uKHtcbiAgICAgICAgYWxnb3JpdGhtOiAnZ3ppcCcsXG4gICAgICAgIGV4dDogJy5neicsXG4gICAgICAgIHRocmVzaG9sZDogMTAyNDAsXG4gICAgICAgIGZpbHRlcjogKGZpbGUpID0+IHtcbiAgICAgICAgICAvLyBPbmx5IGNvbXByZXNzIGZpbGVzIGluc2lkZSBkaXN0LCBub3QgdGhlIGFic29sdXRlIHBhdGhcbiAgICAgICAgICByZXR1cm4gZmlsZS5pbmNsdWRlcygnL2Rpc3QvJykgfHwgZmlsZS5pbmNsdWRlcygnXFxcXGRpc3RcXFxcJyk7XG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICAgIGlzUHJvZHVjdGlvbiAmJiBleGNsdWRlTXN3UGx1Z2luKCksXG4gICAgXS5maWx0ZXIoQm9vbGVhbiksXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgICAgIFwibG9kYXNoXCI6IFwibG9kYXNoLWVzXCIsXG4gICAgICAgIC8vIFdvcmtzcGFjZSBwYWNrYWdlcyAtIHBvaW50IHRvIHNyYyBzaW5jZSBWaXRlIGFsaWFzZXMgZG9uJ3QgcmVzcGVjdCBwYWNrYWdlLmpzb24gZXhwb3J0c1xuICAgICAgICBcIkBmaXNpb2Zsb3cvc2hhcmVkLWFwaVwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vcGFja2FnZXMvc2hhcmVkLWFwaS9zcmNcIiksXG4gICAgICAgIFwiQGZpc2lvZmxvdy9zaGFyZWQtdHlwZXNcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3BhY2thZ2VzL3NoYXJlZC10eXBlcy9zcmNcIiksXG4gICAgICAgIFwiQGZpc2lvZmxvdy9zaGFyZWQtY29uc3RhbnRzXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9wYWNrYWdlcy9zaGFyZWQtY29uc3RhbnRzL3NyY1wiKSxcbiAgICAgICAgXCJAZmlzaW9mbG93L3NoYXJlZC11dGlsc1wiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vcGFja2FnZXMvc2hhcmVkLXV0aWxzL3NyY1wiKSxcbiAgICAgICAgLy8gQWxsb3cgaW1wb3J0aW5nIGxlZ2FjeSBtb2R1bGUgZnJvbSByZWFjdC1ncmlkLWxheW91dFxuICAgICAgICBcInJlYWN0LWdyaWQtbGF5b3V0L2Rpc3QvbGVnYWN5XCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9ub2RlX21vZHVsZXMvcmVhY3QtZ3JpZC1sYXlvdXQvZGlzdC9sZWdhY3kubWpzXCIpLFxuICAgICAgfSxcbiAgICB9LFxuICAgIGJ1aWxkOiB7XG4gICAgICBvdXREaXI6ICdkaXN0JyxcbiAgICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxuICAgICAgdGFyZ2V0OiAnZXNuZXh0JyxcbiAgICAgIG1pbmlmeTogJ3RlcnNlcicsXG4gICAgICB0ZXJzZXJPcHRpb25zOiB7XG4gICAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgICAgZHJvcF9jb25zb2xlOiBpc1Byb2R1Y3Rpb24sXG4gICAgICAgICAgZHJvcF9kZWJ1Z2dlcjogaXNQcm9kdWN0aW9uLFxuICAgICAgICAgIHB1cmVfZnVuY3M6IGlzUHJvZHVjdGlvbiA/IFsnY29uc29sZS5sb2cnLCAnY29uc29sZS5pbmZvJywgJ2NvbnNvbGUuZGVidWcnXSA6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBtYW5nbGU6IGZhbHNlLCAvLyBOZWNlc3NcdTAwRTFyaW8gcGFyYSBldml0YXIgcXVlYnJhcyBlbSBiaWJsaW90ZWNhcyBzZW5zXHUwMEVEdmVpcyBhIG5vbWVzIGRlIGNsYXNzZVxuICAgICAgICBmb3JtYXQ6IHtcbiAgICAgICAgICBjb21tZW50czogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgY29tbW9uanNPcHRpb25zOiB7XG4gICAgICAgIHRyYW5zZm9ybU1peGVkRXNNb2R1bGVzOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICBtYWluOiAnLi9pbmRleC5odG1sJyxcbiAgICAgICAgfSxcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvanMvW25hbWVdLVtoYXNoXS5qcycsXG4gICAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdhc3NldHMvanMvW25hbWVdLVtoYXNoXS5qcycsXG4gICAgICAgICAgYXNzZXRGaWxlTmFtZXM6ICdhc3NldHMvW2V4dF0vW25hbWVdLVtoYXNoXS5bZXh0XScsXG4gICAgICAgICAgLypcbiAgICAgICAgICBtYW51YWxDaHVua3M6IChpZCkgPT4ge1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgICAgICAgICAvLyBDUklUSUNBTDogUmVhY3QgKyBTY2hlZHVsZXIgZGV2ZSBzZXIgc2VtcHJlIG8gcHJpbWVpcm8gY2h1bmsgY2FycmVnYWRvXG4gICAgICAgICAgICAgIC8vIFNjaGVkdWxlciBcdTAwRTkgbmVjZXNzXHUwMEUxcmlvIHBhcmEgUmVhY3QgMTggZnVuY2lvbmFyIGNvcnJldGFtZW50ZVxuICAgICAgICAgICAgICBpZiAoL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dKHJlYWN0fHJlYWN0LWRvbXxzY2hlZHVsZXIpW1xcXFwvXS8udGVzdChpZCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3JlYWN0LXZlbmRvcic7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gUm91dGVyIGRlcGVuZGUgZGUgUmVhY3QsIGNhcnJlZ2FyIGFwXHUwMEYzc1xuICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JlYWN0LXJvdXRlcicpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdyb3V0ZXItdmVuZG9yJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBCaWJsaW90ZWNhcyBkZSBjb25zdWx0YSBxdWUgZGVwZW5kZW0gZGUgUmVhY3RcbiAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdAdGFuc3RhY2svcmVhY3QtcXVlcnknKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAncXVlcnktdmVuZG9yJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBTdXBhYmFzZSBwYXJhIGluaWNpYWxpemFcdTAwRTdcdTAwRTNvXG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQHN1cGFiYXNlJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3N1cGFiYXNlLXZlbmRvcic7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gQ29tcG9uZW50ZXMgVUkgcXVlIGRlcGVuZGVtIGRlIFJlYWN0XG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQHJhZGl4LXVpJykgfHxcbiAgICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnY2xhc3MtdmFyaWFuY2UtYXV0aG9yaXR5JykgfHxcbiAgICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnY2xzeCcpIHx8XG4gICAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ3RhaWx3aW5kLW1lcmdlJykgfHxcbiAgICAgICAgICAgICAgICBpZC5pbmNsdWRlcygncmVhY3QtcmVtb3ZlLXNjcm9sbCcpIHx8XG4gICAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ2FyaWEtaGlkZGVuJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3VpLXZlbmRvcic7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gR3JcdTAwRTFmaWNvc1xuICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JlY2hhcnRzJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2NoYXJ0LXZlbmRvcic7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gVXRpbGl0XHUwMEUxcmlvcyBkZSBkYXRhXG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnZGF0ZS1mbnMnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnZGF0ZS12ZW5kb3InO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIEFuaW1hXHUwMEU3XHUwMEY1ZXMgLSBwb2RlIHNlciBsYXp5IGxvYWRlZFxuICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2ZyYW1lci1tb3Rpb24nKSB8fCBpZC5pbmNsdWRlcygnbW90aW9uJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2FuaW1hdGlvbi12ZW5kb3InO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIEJpYmxpb3RlY2FzIFBERlxuICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2pzcGRmJykgfHwgaWQuaW5jbHVkZXMoJ0ByZWFjdC1wZGYnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAncGRmLXZlbmRvcic7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gRXhjZWxcbiAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCd4bHN4JykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3hsc3gtdmVuZG9yJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBDb3JuZXJzdG9uZSBESUNPTVxuICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0Bjb3JuZXJzdG9uZWpzJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2Nvcm5lcnN0b25lLXZlbmRvcic7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gTWVkaWFQaXBlXG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQG1lZGlhcGlwZScpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdtZWRpYXBpcGUtdmVuZG9yJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBLb252YSBjYW52YXNcbiAgICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdrb252YScpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdrb252YS12ZW5kb3InO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIFx1MDBDRGNvbmVzXG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbHVjaWRlLXJlYWN0JykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2ljb25zLXZlbmRvcic7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gU3RhdGUgbWFuYWdlbWVudFxuICAgICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3p1c3RhbmQnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnenVzdGFuZC12ZW5kb3InO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIEJpYmxpb3RlY2FzIGRlIGRyYWcgJiBkcm9wXG4gICAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQGRuZC1raXQnKSB8fCBpZC5pbmNsdWRlcygnQGhlbGxvLXBhbmdlYS9kbmQnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnZG5kLXZlbmRvcic7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gRGVtYWlzIGRlcGVuZFx1MDBFQW5jaWFzXG4gICAgICAgICAgICAgIHJldHVybiAndmVuZG9yJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgICovXG4gICAgICAgICAgZXhwZXJpbWVudGFsTWluQ2h1bmtTaXplOiAxMDAwMDAsXG4gICAgICAgIH0sXG4gICAgICAgIHByZXNlcnZlRW50cnlTaWduYXR1cmVzOiAnc3RyaWN0JyxcbiAgICAgIH0sXG4gICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDUwMDAsXG4gICAgICByZXBvcnRDb21wcmVzc2VkU2l6ZTogZmFsc2UsXG4gICAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgfSxcbiAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgIGhvbGRVbnRpbENyYXdsRW5kOiBmYWxzZSxcbiAgICAgIGluY2x1ZGU6IFtcbiAgICAgICAgLy8gUmVhY3QgY29yZSAtIENSSVRJQ0FMOiBkZXZlIHNlciBzZW1wcmUgbyBwcmltZWlyb1xuICAgICAgICAncmVhY3QnLFxuICAgICAgICAncmVhY3QtZG9tL2NsaWVudCcsXG4gICAgICAgICdzY2hlZHVsZXInLFxuICAgICAgICAvLyBSZWFjdCBsaWJyYXJpZXMgcXVlIGRlcGVuZGVtIGRvIHNjaGVkdWxlclxuICAgICAgICAncmVhY3Qtcm91dGVyLWRvbScsXG4gICAgICAgICdAdGFuc3RhY2svcmVhY3QtcXVlcnknLFxuICAgICAgICAvLyBGaXJlYmFzZSAtIENSSVRJQ0FMOiBnYXJhbnRpciBzaW5nbGUgaW5zdGFuY2VcbiAgICAgICAgJ2ZpcmViYXNlL2FwcCcsXG4gICAgICAgICdmaXJlYmFzZS9hdXRoJyxcbiAgICAgICAgJ2ZpcmViYXNlL2ZpcmVzdG9yZScsXG4gICAgICAgICdmaXJlYmFzZS9mdW5jdGlvbnMnLFxuICAgICAgICAnZmlyZWJhc2Uvc3RvcmFnZScsXG4gICAgICAgIC8vIEJpYmxpb3RlY2FzIFVJIHF1ZSB1c2FtIFJlYWN0IGhvb2tzIGludGVybmFtZW50ZVxuICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsXG4gICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZHJvcGRvd24tbWVudScsXG4gICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc2VsZWN0JyxcbiAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC10YWJzJyxcbiAgICAgICAgLy8gQmlibGlvdGVjYXMgZGUgYW5pbWFcdTAwRTdcdTAwRTNvIHF1ZSBkZXBlbmRlbSBkZSBSZWFjdFxuICAgICAgICAnZnJhbWVyLW1vdGlvbicsXG4gICAgICAgIC8vIFV0aWxpdFx1MDBFMXJpb3MgcGVzYWRvcyBxdWUgc2UgYmVuZWZpY2lhbSBkZSBwcmUtYnVuZGxpbmdcbiAgICAgICAgJ2RhdGUtZm5zJyxcbiAgICAgICAgJ2RhdGUtZm5zL2xvY2FsZScsIC8vIExvY2FsZSBpbXBvcnRzXG4gICAgICAgICd6b2QnLFxuICAgICAgICAncmVjaGFydHMnLFxuICAgICAgICAnbHVjaWRlLXJlYWN0JyxcbiAgICAgICAgJ2xvZGFzaC1lcycsXG4gICAgICAgIC8vIEJpYmxpb3RlY2FzIGdyXHUwMEUxZmljYXNcbiAgICAgICAgJ2tvbnZhJyxcbiAgICAgICAgJ3JlYWN0LWtvbnZhJyxcbiAgICAgICAgJ3JlYWN0LWdyaWQtbGF5b3V0JyxcbiAgICAgICAgJ3JlYWN0LWRyYWdnYWJsZScsXG4gICAgICAgICdyZWFjdC1yZXNpemFibGUnLFxuICAgICAgXSxcbiAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgJ0Bjb3JuZXJzdG9uZWpzL2RpY29tLWltYWdlLWxvYWRlcicsXG4gICAgICAgICdAY29ybmVyc3RvbmVqcy9jb3JlJyxcbiAgICAgICAgJ0Bjb3JuZXJzdG9uZWpzL3Rvb2xzJyxcbiAgICAgICAgJ0BtZWRpYXBpcGUvcG9zZScsXG4gICAgICAgICdAbWVkaWFwaXBlL3Rhc2tzLXZpc2lvbicsXG4gICAgICAgICdtc3cnLFxuICAgICAgICAvLyBFeGNsdWRlIFBERktpdCBmcm9tIHByZS1idW5kbGluZyB0byBhdm9pZCBjaXJjdWxhciBkZXBlbmRlbmN5IGlzc3Vlc1xuICAgICAgICAvLyBSb2xsdXAgd2lsbCBoYW5kbGUgaXQgZGlyZWN0bHkgaW4gdGhlIGJ1aWxkXG4gICAgICAgICdAcmVhY3QtcGRmL3BkZmtpdCcsXG4gICAgICAgICdAcmVhY3QtcGRmL3JlbmRlcmVyJyxcbiAgICAgIF0sXG4gICAgfSxcbiAgICBlc2J1aWxkOiB7XG4gICAgICBkcm9wOiBpc1Byb2R1Y3Rpb24gPyBbJ2NvbnNvbGUnLCAnZGVidWdnZXInXSA6IFtdLFxuICAgICAgY2hhcnNldDogJ3V0ZjgnLFxuICAgIH0sXG4gIH07XG59KTtcblxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFpVixTQUFTLHdCQUF3QjtBQUNsWCxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBRWhDLFNBQVMsa0JBQWtCO0FBQzNCLE9BQU8scUJBQXFCO0FBUDVCLElBQU0sbUNBQW1DO0FBV3pDLFNBQVMsV0FBVyxZQUFvQixXQUFtQixjQUE0QjtBQUNyRixTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsSUFDUCxtQkFBbUIsTUFBYztBQUcvQixhQUFPLEtBQ0osUUFBUSxrQkFBa0IsVUFBVSxFQUNwQyxRQUFRLGlCQUFpQixTQUFTO0FBQUEsSUFDdkM7QUFBQSxFQUNGO0FBQ0Y7QUFHQSxTQUFTLG9CQUFvQjtBQUMzQixRQUFNLGdCQUFnQjtBQUFBLElBQ3BCO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLEVBQ0Y7QUFHQSxRQUFNLGtCQUFrQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBWXhCLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLFVBQVUsSUFBWTtBQUNwQixVQUFJLE9BQU8seUJBQXlCO0FBQ2xDLGVBQU8sRUFBRSxJQUFJLDhCQUE4QixVQUFVLE1BQU07QUFBQSxNQUM3RDtBQUNB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
