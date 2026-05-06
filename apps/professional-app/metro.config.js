const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;

// SDK 52+ auto-detects the monorepo root via package.json workspaces.
// Do NOT manually set watchFolders or nodeModulesPaths — it causes Metro
// to treat the monorepo root as the project root, breaking expo-router/entry resolution.
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

// Segue symlinks do pnpm
config.resolver.unstable_enableSymlinks = true;

// Package exports desabilitado: expo-router não tem campo exports e o
// modo strict bloqueia o acesso a expo-router/entry como deep import.
config.resolver.unstable_enablePackageExports = false;

config.server.port = 8081;

module.exports = config;
