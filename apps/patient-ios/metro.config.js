const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add watchFolders for pnpm workspace
config.watchFolders = [
  path.resolve(__dirname, '../../'),
  path.resolve(__dirname, '../shared-api'),
  path.resolve(__dirname, '../shared-utils'),
];

// Add resolver options for pnpm
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];

module.exports = config;
