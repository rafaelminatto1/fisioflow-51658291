const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable web platform
config.resolver.platforms = ['ios', 'android', 'web'];

// Add source extensions for TypeScript and Firebase
config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'ts', 'tsx', 'mjs', 'cjs'];

// Habilitar suporte a package exports (necessário para Firebase v11+)
config.resolver.unstable_enablePackageExports = true;

// Permitir symlinks
config.resolver.unstable_symlinks = true;

module.exports = config;
