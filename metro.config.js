/**
 * Metro Configuration para FisioFlow
 * Configuração simplificada para Expo SDK 54
 */

const { getDefaultConfig } = require('expo/metro-config');

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
 * Usa resolveRequires com polyfills vazios
 */
const extraNodeModules = {};
webOnlyPackages.forEach(pkg => {
  extraNodeModules[pkg] = false; // Don't resolve these packages
});

/**
 * Adicionar polyfills vazios para pacotes web-only
 */
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  ...Object.fromEntries(
    webOnlyPackages.map(pkg => [pkg, false])
  ),
};

/**
 * Blocklist para arquivos web-only
 */
config.resolver.blockList = [
  ...config.resolver.blockList || [],
  /.*\/node_modules\/(react-dom|react-router-dom|recharts|vite|@vitejs\/plugin-react|rollup-plugin-visualizer|vite-plugin-compression|vite-plugin-pwa|workbox-window|web-vitals)\/.*/,
  /.*\/node_modules\/@radix\/.*/,
];

module.exports = config;
