const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

// Find the project and workspace root
const projectRoot = __dirname;
// This can be replaced with `find-up` however for simplicity we just go up one level
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve (and bundle) packages from their source if needed
// This is important for packages linked via pnpm/workspace
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
