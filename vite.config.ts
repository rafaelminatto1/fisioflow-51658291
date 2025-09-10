import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    server: {
      host: "::",
      port: 8080,
      open: true,
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    
    // Configurações de build otimizadas
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'esnext',
      minify: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
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
    },
    
    // Configurações de esbuild
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
    },
  };
});