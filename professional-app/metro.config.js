const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Caminhos do Monorepo
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');
const packagesUiRoot = path.resolve(monorepoRoot, 'packages/ui');

// Configuração do Metro
const config = getDefaultConfig(projectRoot);

// ============================================
// 1. PRIORIDADE TOTAL PARA EXTENSÕES NATIVAS
// ============================================
// Colocar .native.* no topo da lista de extensões
// Isso garante que .native.tsx seja resolvido antes de .tsx
config.resolver.sourceExts = [
  'native.ts',
  'native.tsx',
  'native.js',
  'native.jsx',
  'ts',
  'tsx',
  'js',
  'jsx',
  'json',
  'mjs',
  'cjs',
];

// ============================================
// 2. CONFIGURAÇÃO DE PLATAFORMA
// ============================================
// Priorizar campos react-native em node_modules linkados
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Habilitar suporte a package exports para monorepo
config.resolver.unstable_enablePackageExports = true;

// Permitir symlinks (necessário para pnpm workspace)
config.resolver.unstable_symlinks = true;

// ============================================
// 3. WATCH FOLDERS E RESOLUÇÃO
// ============================================
// Incluir o monorepoRoot para acessar packages/ui
config.watchFolders = [monorepoRoot];

// Node Modules Resolution Strategy (Evitar duplicidade do React)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Não desabilitar hierarchical lookup pois é necessário para pnpm
// config.resolver.disableHierarchicalLookup = true;

// ============================================
// 4. TRANSFORMER - GARANTIR TRANSPILAÇÃO DO packages/ui
// ============================================
// Forçar transpilação de todos os arquivos TypeScript/JSX no packages/ui
config.transformer = {
  ...config.transformer,
  minifierPath: require.resolve('metro-minify-terser'),
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
    output: {
      comments: false,
    },
  },
};

// ============================================
// 5. ALIAS PARA DEPENDÊNCIAS WEB
// ============================================
// Criar stub para framer-motion (evita bundle da versão web)
// NOTA: Não usamos alias para lucide-react pois os componentes .native.tsx
// já estão configurados para usar lucide-react-native diretamente
try {
  config.resolver.alias = {
    'framer-motion': require.resolve('./stubs/framer-motion'),
  };
} catch (e) {
  // Se o stub não existir, continuar sem alias
}

// ============================================
// 6. BLOCKLIST - EXCLUIR CÓDIGO WEB
// ============================================
// Bloquear arquivos desnecessários e código web específico
config.resolver.blockList = [
  /test-results\/.*/,
  /playwright-report\/.*/,
  /testsprite_tests\/.*/,
  /\.git\/.*/,
  /\.firebase\/.*/,
  /dataconnect\/.*/,
  /functions\/.*/,
  /e2e\//,
  // Bloquear arquivos de teste e storybook do packages/ui
  /packages\/ui\/src\/\*\*\/\.test\.(ts|tsx|js|jsx)$/,
  /packages\/ui\/src\/\*\*\/\.stories\.(ts|tsx|js|jsx)$/,
  // Bloquear a pasta web do monorepo
  /\/src\/web\//,
];

// ============================================
// 7. CONFIGURAÇÕES DO SERVIDOR
// ============================================
config.server = {
  ...config.server,
  port: 8081,
};

module.exports = config;
