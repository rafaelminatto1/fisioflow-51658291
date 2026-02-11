const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable web platform
config.resolver.platforms = ['ios', 'android', 'web'];

// Add source extensions for TypeScript
config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'ts', 'tsx'];

module.exports = config;
