const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Caminhos do Monorepo
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

// Configuração base do Metro do Expo
const config = getDefaultConfig(projectRoot);

// 1. Suporte a Monorepo (Watch Folders e Node Modules)
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 2. Extensões de Arquivo (Preservar defaults do Expo e adicionar nativas)
const defaultSourceExts = config.resolver.sourceExts;
config.resolver.sourceExts = [
  'native.ts',
  'native.tsx',
  'native.js',
  'native.jsx',
  ...defaultSourceExts,
];

// 3. Configuração de Plataforma e Resolvers
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_symlinks = true;

// 4. Transformer e Minificação
config.transformer.minifierPath = require.resolve('metro-minify-terser');
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: { keep_fnames: true },
  output: { comments: false },
};

// 5. Aliases (Opcional, se necessário para stubs)
try {
  config.resolver.alias = {
    'framer-motion': require.resolve('./stubs/framer-motion'),
    ...config.resolver.alias,
  };
} catch (e) {
  // Ignorar se o stub não existir
}

// 6. Blocklist (Otimização Drástica)
config.resolver.blockList = [
  // Testes e relatórios
  /test-results\/.*/,
  /playwright-report\/.*/,
  /testsprite_tests\/.*/,
  /e2e\//,
  /playwright\//,
  /playwright-logs\/.*/,
  /playwright-screenshots\/.*/,
  /playwright-video\/.*/,
  /.*\.cache.*/,
  // Git e Firebase
  /\.git\/.*/,
  /\.firebase\/.*/,
  // Documentação e scripts de desenvolvimento
  /.*\.md$/,
  /scripts\//,
  /stubs\//,
  /claude-skills\//,
  /\.*claude\/.*/,
  /\.gemini\/.*/,
  // Cloud Functions (não usado no mobile)
  /functions\//,
  // Arquivos de validação e teste
  /check_patients\.js$/,
  /test-notifications\.js$/,
  /test-protocols\.js$/,
  /validate-setup\.js$/,
  // Bloquear pacotes pesados de web/desktop do monorepo raiz que não são usados no app mobile
  /node_modules\/@cornerstonejs\/.*/,
  /node_modules\/@aws-sdk\/.*/,
  /node_modules\/@sentry\/vite-plugin\/.*/,
  /node_modules\/@playwright\/.*/,
  /node_modules\/puppeteer\/.*/,
  /node_modules\/.*\/node_modules/,
];

// 7. Porta do Servidor
config.server.port = 8081;

module.exports = config;
