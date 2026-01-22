/**
 * Metro Configuration para FisioFlow
 * Configuração para Expo SDK 54 com suporte a pnpm
 * React Native Web precisa do react-dom para funcionar
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

/**
 * Watch folders - incluir node_modules raiz para pnpm
 */
config.watchFolders = [__dirname];

/**
 * Configuração extra para resolver módulos na estrutura do pnpm
 * pnpm usa uma estrutura aninhada de node_modules que pode confundir o Metro
 */
config.resolver.nodeModulesPath = [
  path.resolve(__dirname, 'node_modules'),
];

/**
 * Blocklist para arquivos web-only que NÃO devem ser incluídos
 * Nota: react-dom é necessário para React Native Web funcionar
 */
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  /.*\/node_modules\/(react-router-dom|recharts|vite|@vitejs\/plugin-react|rollup-plugin-visualizer|vite-plugin-compression|vite-plugin-pwa|workbox-window|web-vitals)\/.*/,
  /.*\/node_modules\/@radix\/.*/,
];

/**
 * SourceExts para suportar arquivos .cjs
 */
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;
