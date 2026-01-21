/**
 * Metro Configuration para FisioFlow
 * Configuração simplificada para Expo SDK 54
 */

import { getDefaultConfig } from 'expo/metro-config.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração base do Expo
const config = getDefaultConfig(__dirname);

/**
 * Pacotes web-only que devem ser excluídos do React Native bundle
 */
const webOnlyPackages = [
  // Radix UI (shadcn/ui components)
  '@radix-ui/react-accordion',
  '@radix-ui/react-alert-dialog',
  '@radix-ui/react-aspect-ratio',
  '@radix-ui/react-avatar',
  '@radix-ui/react-checkbox',
  '@radix-ui/react-collapsible',
  '@radix-ui/react-context-menu',
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-hover-card',
  '@radix-ui/react-label',
  '@radix-ui/react-menubar',
  '@radix-ui/react-navigation-menu',
  '@radix-ui/react-popover',
  '@radix-ui/react-progress',
  '@radix-ui/react-radio-group',
  '@radix-ui/react-scroll-area',
  '@radix-ui/react-select',
  '@radix-ui/react-separator',
  '@radix-ui/react-slider',
  '@radix-ui/react-slot',
  '@radix-ui/react-switch',
  '@radix-ui/react-tabs',
  '@radix-ui/react-toast',
  '@radix-ui/react-toggle',
  '@radix-ui/react-toggle-group',
  '@radix-ui/react-tooltip',
  // Web-specific libraries
  'recharts',
  'react-dom',
  'react-router-dom',
  'react-webcam',
  'react-pdf',
  '@react-pdf/renderer',
  'swagger-ui-react',
  // Build tools (web-only)
  'vite',
  '@vitejs/plugin-react',
  '@vitejs/plugin-react-swc',
  'rollup-plugin-visualizer',
  'vite-plugin-compression',
  'vite-plugin-pwa',
  'workbox-window',
  'web-vitals',
];

/**
 * Custom resolver para excluir pacotes web-only
 */
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Pular pacotes web-only
  if (webOnlyPackages.some(pkg => moduleName === pkg || moduleName.startsWith(pkg + '/'))) {
    return {
      filePath: '',
      type: 'empty',
    };
  }

  // Pular entry points web-specific
  if (moduleName === 'index.html' || moduleName === '/src/main.tsx') {
    return {
      filePath: '',
      type: 'empty',
    };
  }

  // Usar o resolver original para outros casos
  return originalResolver?.(context, moduleName, platform);
};

/**
 * Configurar watchFolders
 */
config.watchFolders = [__dirname];

/**
 * Source extensions suportadas (incluindo todas do Expo)
 */
config.resolver.sourceExts = [
  'tsx',
  'ts',
  'jsx',
  'js',
  'json',
  'mjs',
  'cjs',
];

export default config;
