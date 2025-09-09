import { defineConfig } from 'vite';
import { resolve } from 'path';

// Configurações de performance para produção
export const performanceConfig = {
  build: {
    // Code splitting otimizado
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks separados
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'chart-vendor': ['recharts'],
          'date-vendor': ['date-fns'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers'],
          'query-vendor': ['@tanstack/react-query'],
          
          // Feature chunks
          'analytics': [
            './src/pages/analytics/AnalyticsDashboard.tsx',
            './src/components/analytics'
          ],
          'reports': [
            './src/pages/reports/ReportsLibrary.tsx',
            './src/components/reports'
          ],
          'smart-features': [
            './src/pages/SmartAI.tsx',
            './src/pages/SmartExercisePlans.tsx'
          ],
          'communications': [
            './src/pages/Communications.tsx',
            './src/components/communications'
          ]
        },
        // Nomes de arquivo com hash para cache busting
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          return `assets/js/[name]-[hash].js`;
        },
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
            return `assets/images/[name]-[hash].${ext}`;
          }
          if (/\.(css)$/i.test(assetInfo.name || '')) {
            return `assets/css/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },
    
    // Otimizações de build
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      mangle: {
        safari10: true
      },
      format: {
        safari10: true
      }
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // Source maps para produção (opcional)
    sourcemap: false
  },
  
  // Otimizações de servidor de desenvolvimento
  server: {
    // Preload de módulos
    warmup: {
      clientFiles: [
        './src/App.tsx',
        './src/pages/Index.tsx',
        './src/pages/Patients.tsx',
        './src/pages/Schedule.tsx'
      ]
    }
  },
  
  // Configurações de preview (produção local)
  preview: {
    headers: {
      // Cache headers para assets estáticos
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  },
  
  // Otimizações de dependências
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'date-fns',
      'recharts'
    ],
    exclude: [
      // Excluir dependências que devem ser carregadas dinamicamente
    ]
  }
};

// Headers de cache para diferentes tipos de arquivo
export const cacheHeaders = {
  // Assets estáticos (imagens, fontes, etc.)
  static: {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Expires': new Date(Date.now() + 31536000000).toUTCString()
  },
  
  // JavaScript e CSS com hash
  hashed: {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Expires': new Date(Date.now() + 31536000000).toUTCString()
  },
  
  // HTML (sem cache para sempre buscar a versão mais recente)
  html: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
  
  // API responses
  api: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
};

// Configuração de compressão
export const compressionConfig = {
  // Gzip compression
  gzip: {
    threshold: 1024, // Comprimir arquivos > 1KB
    level: 6, // Nível de compressão (1-9)
    memLevel: 8
  },
  
  // Brotli compression (melhor que gzip)
  brotli: {
    threshold: 1024,
    quality: 6, // Qualidade de compressão (0-11)
    lgwin: 22
  }
};

// Configuração de preload inteligente
export const preloadConfig = {
  // Recursos críticos para preload
  critical: [
    '/src/App.tsx',
    '/src/pages/Index.tsx',
    '/src/components/layout/Sidebar.tsx',
    '/src/components/layout/Header.tsx'
  ],
  
  // Recursos para prefetch (baixa prioridade)
  prefetch: [
    '/src/pages/analytics/AnalyticsDashboard.tsx',
    '/src/pages/reports/ReportsLibrary.tsx',
    '/src/pages/SmartAI.tsx'
  ]
};