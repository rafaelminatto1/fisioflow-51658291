const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Encontrar o diretório raiz do monorepo (onde está a pasta 'src')
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. Adicionar a raiz do workspace para que o Metro possa resolver módulos de lá
config.watchFolders = [workspaceRoot];

// 2. Permitir que o Metro resolva imports da pasta 'src' e 'node_modules' da raiz
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Forçar o Metro a resolver bibliotecas nativas apenas do projeto mobile
// Alterado para false para permitir que o Metro resolva links simbólicos do pnpm corretamente
config.resolver.disableHierarchicalLookup = false;

// 5. Mapeamento explícito para pacotes problemáticos com symlinks
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'whatwg-fetch': path.resolve(projectRoot, 'node_modules/whatwg-fetch'),
};

// 4. Ignorar pastas de teste e build que confundem o watcher
config.resolver.blockList = [
  /test-results\/.*/,
  /playwright-report\/.*/,
  /dist\/.*/,
  /\.git\/.*/,
  /\.firebase\/.*/,
  /dataconnect\/.*/,
  /functions\/.*/
];

module.exports = config;
