const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Adicionar suporte para whatwg-fetch
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Criar um polyfill resolver para whatwg-fetch
const whatwgFetchPath = path.resolve(projectRoot, 'node_modules/whatwg-fetch/dist/fetch.umd.js');

// Adicionar resolução customizada
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Para whatwg-fetch, usar o arquivo .js diretamente
  if (moduleName === 'whatwg-fetch') {
    return {
      filePath: whatwgFetchPath,
      type: 'sourceFile',
    };
  }
  // Caso contrário, usar o resolver padrão
  return context.resolveRequest(context, moduleName, platform);
};

// Ignorar pastas que não precisam ser watchadas
config.resolver.blockList = [
  /test-results\/.*/,
  /playwright-report\/.*/,
  /dist\/.*/,
  /\.git\/.*/,
  /\.firebase\/.*/,
  /dataconnect\/.*/,
  /functions\/.*/,
  /e2e\/.*/,
  /testsprite_tests\/.*/,
];

module.exports = config;
