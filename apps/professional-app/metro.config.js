const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.resolver.sourceExts = [
  "native.ts",
  "native.tsx",
  "native.js",
  "native.jsx",
  ...config.resolver.sourceExts,
  "mjs",
];

// Stubs para bibliotecas web que não funcionam no Native
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "framer-motion": path.resolve(projectRoot, "stubs/framer-motion.js"),
  "@radix-ui/react-slot": path.resolve(projectRoot, "stubs/radix-slot.js"),
};

// blockList: Bloqueia apenas o que é estritamente necessário para evitar conflitos.
// Com unstable_enableSymlinks, o Metro segue os links do pnpm de forma eficiente.
config.resolver.blockList = [
  /.*\.cache.*/,
  /\.git\/.*/,
  /.*\.md$/,
  // Bloqueia pacotes pesados ou problemáticos na raiz
  /node_modules\/@aws-sdk\/.*/,
  /node_modules\/@sentry\/vite-plugin\/.*/,
  /node_modules\/@playwright\/.*/,
  /node_modules\/puppeteer\/.*/,
  /node_modules\/workerd\/.*/,
  /node_modules\/esbuild\/.*/,
  /node_modules\/sharp\/.*/,
];

// pnpm usa symlinks intensamente.
// unstable_enableSymlinks permite que o Metro siga esses symlinks sem precisar
// assistir a gigantesca pasta .pnpm/ ou o node_modules da raiz inteira.
config.resolver.unstable_enableSymlinks = true;

// watchFolders: Assistimos apenas a pasta do projeto e as pastas de pacotes locais necessárias.
// NÃO incluímos o node_modules da raiz (8GB+) para evitar lentidão extrema no Metro.
config.watchFolders = [
  projectRoot,
  // Se houver pacotes locais em /packages que este app usa, adicione-os aqui.
  // O pnpm fará o link para eles em node_modules/@fisioflow/xxx.
];

// Resolução de módulos: garante que o Metro encontre pacotes "hoisted" no monorepo.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config.server.port = 8081;

// Define o root do servidor como a raiz do monorepo para URLs consistentes.
config.server.unstable_serverRoot = monorepoRoot;

module.exports = config;
