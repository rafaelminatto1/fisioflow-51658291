const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Extensões nativas primeiro para resolução correta no iOS/Android
config.resolver.sourceExts = [
  "native.ts",
  "native.tsx",
  "native.js",
  "native.jsx",
  ...config.resolver.sourceExts,
  "mjs",
];

// Stubs para bibliotecas web incompatíveis com React Native
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "framer-motion": path.resolve(projectRoot, "stubs/framer-motion.js"),
  "@radix-ui/react-slot": path.resolve(projectRoot, "stubs/radix-slot.js"),
};

// Bloqueia pacotes pesados que não têm uso no bundle nativo
config.resolver.blockList = [
  /.*\.cache.*/,
  /\.git\/.*/,
  /.*\.md$/,
  /node_modules\/@aws-sdk\/.*/,
  /node_modules\/@sentry\/vite-plugin\/.*/,
  /node_modules\/@playwright\/.*/,
  /node_modules\/puppeteer\/.*/,
  /node_modules\/workerd\/.*/,
  /node_modules\/esbuild\/.*/,
  /node_modules\/sharp\/.*/,
];

// pnpm monorepo: watchFolders inclui apps/ e packages/ da raiz (obrigatório para EAS)
config.watchFolders = [
  path.resolve(monorepoRoot, "apps"),
  path.resolve(monorepoRoot, "packages"),
];

// pnpm monorepo: resolve a partir do node_modules do app primeiro, depois da raiz
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Segue symlinks do pnpm e respeita package.json exports
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

config.server.port = 8081;

module.exports = config;
