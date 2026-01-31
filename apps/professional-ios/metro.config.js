const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

// Find the project and workspace root
const projectRoot = __dirname;
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
config.resolver.disableHierarchicalLookup = true;

// 4. Block duplicates that cause crashes (Reanimated)
config.resolver.blockList = [
    // Exclude react-native-reanimated from root if it exists, forcing usage of app's version
    new RegExp(
        `^${escape(path.resolve(workspaceRoot, 'node_modules/react-native-reanimated'))}\\/.*$`
    ),
];

function escape(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = config;
