const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

// Configuração isolada do Metro para professional-app
const config = getDefaultConfig(__dirname);

// Adicionar extensões de arquivo para Firebase e outros pacotes que usam ESM
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'mjs',
  'cjs',
];

// Configurar campos de resolução para React Native
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Habilitar suporte a package exports (necessário para Firebase v11+)
config.resolver.unstable_enablePackageExports = true;

// Permitir symlinks em node_modules
config.resolver.unstable_symlinks = true;

// IMPORTANTE: Não adicionar watchFolders do monorepo
config.watchFolders = [__dirname];

// Configurar blockList para não bloquear arquivos necessários
config.resolver.blockList = [
  /test-results\/.*/,
  /playwright-report\/.*/,
  /testsprite_tests\/.*/,
  /\.git\/.*/,
  /\.firebase\/.*/,
  /dataconnect\/.*/,
  /functions\/.*/,
  /e2e\//,
];

// Configurações do servidor
config.server = {
  ...config.server,
  port: 8081,
};

module.exports = config;
