/**
 * FisioFlow - Metro Configuration
 * Configuração do Metro bundler para Expo com exclusão de pacotes web-only
 */

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Web-only packages that should be excluded from React Native builds
const webOnlyPackages = [
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
  'recharts',
  'react-dom',
  'react-router-dom',
  'react-webcam',
  'react-pdf',
  '@react-pdf/renderer',
  'swagger-ui-react',
  'vite',
  '@vitejs/plugin-react',
  '@vitejs/plugin-react-swc',
  'rollup-plugin-visualizer',
  'vite-plugin-compression',
  'vite-plugin-pwa',
  'workbox-window',
  'web-vitals',
];

// Store the original resolveRequest
const originalResolveRequest = config.resolver.resolveRequest;

// Custom resolveRequest that excludes web-only packages
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Skip web-only packages
  if (webOnlyPackages.some(pkg => moduleName === pkg || moduleName.startsWith(pkg + '/'))) {
    return { type: 'empty' };
  }

  // Skip web-specific entry points
  if (moduleName === 'index.html' || moduleName === '/src/main.tsx') {
    return { type: 'empty' };
  }

  // Continue with default resolution
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  // Fallback to default Metro resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
