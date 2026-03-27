const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..", "..");

const config = getDefaultConfig(projectRoot);

// Monorepo pnpm support
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, "node_modules"),
	path.resolve(monorepoRoot, "node_modules"),
];

// Extensões extras
config.resolver.sourceExts = [
	"native.ts",
	"native.tsx",
	"native.js",
	"native.jsx",
	...config.resolver.sourceExts,
	"mjs",
];

// Stubs para dependências web não usadas no mobile
try {
	config.resolver.extraNodeModules = {
		...(config.resolver.extraNodeModules || {}),
		"framer-motion": path.resolve(projectRoot, "stubs/framer-motion.js"),
		"@radix-ui/react-slot": path.resolve(projectRoot, "stubs/radix-slot.js"),
	};
} catch (e) {
	// stubs opcionais
}

// Blocklist — exclui pastas que não devem entrar no bundle mobile
config.resolver.blockList = [
	/.*\.cache.*/,
	/\.git\/.*/,
	/.*\.md$/,
	/node_modules\/@cornerstonejs\/.*/,
	/node_modules\/@aws-sdk\/.*/,
	/node_modules\/@sentry\/vite-plugin\/.*/,
	/node_modules\/@playwright\/.*/,
	/node_modules\/puppeteer\/.*/,
];

config.server.port = 8081;

module.exports = config;
