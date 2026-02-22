const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Caminhos do Monorepo
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

// Configuração do Metro
const config = getDefaultConfig(projectRoot);

// Adicionar extensões de arquivo
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'mjs',
  'cjs',
];

// Campos principais de resolução
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Habilitar suporte a package exports
config.resolver.unstable_enablePackageExports = true;

// Permitir symlinks
config.resolver.unstable_symlinks = true;

// Watch folders: Incluir a raiz do monorepo para acessar packages/ui
config.watchFolders = [monorepoRoot];

// Node Modules Resolution Strategy (Evitar duplicidade do React)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

// Blocklist para arquivos desnecessários
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
