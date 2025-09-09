import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { performanceConfig } from "./vite.config.performance";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    server: {
      host: "::",
      port: 8080,
      open: true, // Abre o navegador automaticamente
      // Configurações de performance para desenvolvimento
      ...(!isProduction && performanceConfig.server)
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
    build: isProduction ? {
      ...performanceConfig.build,
      // Manter configurações específicas do projeto
      outDir: 'dist',
      emptyOutDir: true,
    } : {
      // Build de desenvolvimento mais rápido
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
      ...performanceConfig.optimizeDeps,
      // Forçar pre-bundling de dependências críticas
      force: isProduction
    },
    
    // Configurações de preview (produção local)
    preview: isProduction ? performanceConfig.preview : undefined,
    
    // Configurações de esbuild
    esbuild: {
      // Remove console.log em produção
      drop: isProduction ? ['console', 'debugger'] : [],
      // Otimizações adicionais para produção
      ...(isProduction && {
        legalComments: 'none',
        minifyIdentifiers: true,
        minifySyntax: true,
        minifyWhitespace: true
      })
    },
    
    // Configurações de CSS
    css: {
      // Minificação de CSS em produção
      ...(isProduction && {
        postcss: {
          plugins: [
            // Plugins de otimização podem ser adicionados aqui
          ]
        }
      })
    }
  };
});
