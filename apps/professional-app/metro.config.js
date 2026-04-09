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

try {
	config.resolver.extraNodeModules = {
		...config.resolver.extraNodeModules,
		"framer-motion": path.resolve(projectRoot, "stubs/framer-motion.js"),
		"@radix-ui/react-slot": path.resolve(projectRoot, "stubs/radix-slot.js"),
	};
} catch {}

// extraNodeModules só funciona para pacotes não encontrados no node_modules.
// Para pacotes que EXISTEM mas têm módulos nativos ausentes no dev build,
// usamos resolveRequest para interceptar e redirecionar para stubs.
const moduleStubs = {
	"react-native-vision-camera": path.resolve(projectRoot, "stubs/vision-camera.js"),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
	if (moduleStubs[moduleName]) {
		return { filePath: moduleStubs[moduleName], type: "sourceFile" };
	}
	return context.resolveRequest(context, moduleName, platform);
};

// Helper para converter path em regex de blockList/ignored
function blockPath(p) {
	return new RegExp(p.replace(/[/\\]/g, "[/\\\\]") + ".*");
}

// Diretórios do monorepo raiz que devem ser ignorados
const monorepoBlocks = [
	"apps/web",
	"apps/api",
	"apps/patient-app",
	"apps/vinext-poc",
	"apps/jules-bot",
	"apps/mobile-ios",
	"src",
	"packages/jules",
	"e2e",
	"cloudflare-worker",
	"docker",
	"scripts",
	"testsprite_tests",
	"docs",
	"docs2026",
	"playwright",
	".storybook",
	"workers",
].map((p) => blockPath(path.resolve(monorepoRoot, p)));

// Diretórios dentro do próprio professional-app que devem ser ignorados
const localBlocks = [
	"apps",      // apps/api/node_modules, apps/web/node_modules
	"packages",  // packages/jules/node_modules
	"worker",    // Cloudflare worker local
	"dist",
	"e2e",
	"drizzle",
	"db",
	"playwright-logs",
	"playwright-screenshots",
	"playwright-video",
	"claude-skills",
].map((p) => blockPath(path.resolve(projectRoot, p)));

config.resolver.blockList = [
	/.*\.cache.*/,
	/\.git\/.*/,
	/.*\.md$/,
	// Bloqueia .pnpm — Metro segue os symlinks de node_modules sem indexar os 4GB
	/node_modules\/\.pnpm\/.*/,
	/node_modules\/@aws-sdk\/.*/,
	/node_modules\/@sentry\/vite-plugin\/.*/,
	/node_modules\/@playwright\/.*/,
	/node_modules\/puppeteer\/.*/,
	/node_modules\/workerd\/.*/,
	/node_modules\/esbuild\/.*/,
	/node_modules\/sharp\/.*/,
	...monorepoBlocks,
	...localBlocks,
];

// pnpm usa symlinks: node_modules/expo-router → ../../../.pnpm/expo-router@x/node_modules/expo-router
// unstable_enableSymlinks permite Metro seguir esses symlinks sem precisar assistir
// toda a pasta node_modules/.pnpm/ como watchFolder.
config.resolver.unstable_enableSymlinks = true;

// watchFolders: apenas o app. Pacotes do monorepo devem ser declarados
// explicitamente no package.json para ficarem no node_modules local.
config.watchFolders = [projectRoot];

// Resolução de módulos: local primeiro, depois raiz (pnpm hoist)
config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, "node_modules"),
	path.resolve(monorepoRoot, "node_modules"),
];

config.server.port = 8081;

module.exports = config;
