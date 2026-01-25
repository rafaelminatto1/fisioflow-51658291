const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Enable symlinks for monorepo support
config.resolver.unstable_enableSymlinks = true;

// WATCH: project root and workspace root
config.watchFolders = [
  projectRoot,
  workspaceRoot,
];

// RESOLVE: search order for node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// FEILDS: priority for web and native
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// EXTENSIONS: support for ESM packages
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json', 'mjs', 'cjs'];

// BLOCK: avoid git history
config.resolver.blockList = [
  /.*\.git\/.*/,
];

module.exports = config;




