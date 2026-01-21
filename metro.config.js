/**
 * Metro Configuration para FisioFlow
 * Configuração simplificada para Expo SDK 54
 * ES Module version
 */

import { getDefaultConfig } from 'expo/metro-config.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = getDefaultConfig(__dirname);

/**
 * Blocklist para arquivos web-only
 */
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  /.*\/node_modules\/(react-dom|react-router-dom|recharts|vite|@vitejs\/plugin-react|rollup-plugin-visualizer|vite-plugin-compression|vite-plugin-pwa|workbox-window|web-vitals)\/.*/,
  /.*\/node_modules\/@radix\/.*/,
];

/**
 * Watch folders
 */
config.watchFolders = [__dirname];

export default config;
