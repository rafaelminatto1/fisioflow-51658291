import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

const repoRoot = path.resolve(__dirname, "../..");

function htmlPlugin(appVersion: string, buildTime: string): any {
	return {
		name: "html-transform",
		apply: "build",
		transformIndexHtml(html: string) {
			return html
				.replace(/%APP_VERSION%/g, appVersion)
				.replace(/%BUILD_TIME%/g, buildTime)
				.replace(/%CACHE_BUSTER%/g, buildTime);
		},
	};
}

// Plugin para mockar módulos mobile-only
function mockMobileModules() {
	const mobileModules = [
		"expo-notifications",
		"expo-device",
		"expo-constants",
		"expo-application",
		"react-native",
		"@react-native-async-storage/async-storage",
		"@react-native-community/netinfo",
		"react-native-toast-message",
	];
	const exactModuleSet = new Set(mobileModules);

	return {
		name: "mock-mobile-modules",
		resolveId(id: string) {
			if (
				exactModuleSet.has(id) ||
				mobileModules.some((moduleName) => id.startsWith(`${moduleName}/`))
			) {
				return { id: "/virtual-mobile-stub", external: false };
			}
		},
		load(id: string) {
			if (id === "/virtual-mobile-stub") {
				return 'export default {}; export const Platform = { OS: "web" }; export const AsyncStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };';
			}
		},
	};
}

function lazyCornerstoneCharls() {
	const lazyDecoderPath = path.resolve(
		repoRoot,
		"src/components/analysis/dicom/decoders/lazyDecodeJPEGLS.ts",
	);

	return {
		name: "lazy-cornerstone-charls",
		enforce: "pre" as const,
		resolveId(source: string, importer?: string) {
			if (
				!importer ||
				!importer.includes("@cornerstonejs/dicom-image-loader")
			) {
				return null;
			}

			if (
				source === "./decodeJPEGLS" ||
				source === "./shared/decoders/decodeJPEGLS"
			) {
				return lazyDecoderPath;
			}

			return null;
		},
	};
}

export default defineConfig(({ mode }) => {
	const isProduction = mode === "production";
	const isAnalyze = process.env.ANALYZE === "true";
	const buildTime = Date.now().toString();
	const VERSION_SUFFIX = "-v2.5.0-vite8";
	const appVersion =
		(process.env.GIT_COMMIT_SHA || process.env.VITE_APP_VERSION || buildTime) +
		VERSION_SUFFIX;

	return {
		define: {
			__APP_VERSION__: JSON.stringify(appVersion),
			__BUILD_TIME__: JSON.stringify(buildTime),
			__CACHE_BUSTER__: JSON.stringify(buildTime),
		},
		plugins: [
			tailwindcss(),
			react(),
			mockMobileModules(),
			lazyCornerstoneCharls(),
			htmlPlugin(appVersion, buildTime),
			isAnalyze &&
				visualizer({
					filename: "stats.html",
					template: "treemap",
					gzipSize: true,
					brotliSize: true,
					emitFile: true,
				}),
			isProduction &&
				process.env.SENTRY_AUTH_TOKEN &&
				sentryVitePlugin({
					org: "fisioflow",
					project: "fisioflow-web",
					authToken: process.env.SENTRY_AUTH_TOKEN,
				}),
		].filter(Boolean),
		worker: {
			format: "es",
		},
		resolve: {
			// Manual aliases are used below for precise control over package versions and stubs.
			dedupe: ["react", "react-dom", "framer-motion"],
			alias: {
				"@": path.resolve(repoRoot, "src"),
				lodash: "lodash-es",
				"@fisioflow/ui": path.resolve(repoRoot, "packages/ui/src"),
				"@fisioflow/core": path.resolve(repoRoot, "packages/core/src"),
				"@fisioflow/codec-charls-real": path.resolve(
					repoRoot,
					"node_modules/@cornerstonejs/codec-charls/dist/charlswasm_decode.js",
				),
				"@fisioflow/codec-charls-wasm": path.resolve(
					repoRoot,
					"node_modules/@cornerstonejs/codec-charls/dist/charlswasm_decode.wasm",
				),
				"@fisioflow/skills": path.resolve(repoRoot, "src/lib/skills"),
				"react-grid-layout/dist/legacy": path.resolve(
					repoRoot,
					"node_modules/react-grid-layout/dist/legacy.mjs",
				),
				globalthis: "globalthis",
				fs: path.resolve(repoRoot, "src/lib/node-stub.ts"),
				path: path.resolve(repoRoot, "src/lib/node-stub.ts"),
				crypto: path.resolve(repoRoot, "src/lib/node-stub.ts"),
				stream: path.resolve(repoRoot, "src/lib/node-stub.ts"),
				util: path.resolve(repoRoot, "src/lib/node-stub.ts"),
				"@mediapipe/pose": path.resolve(
					repoRoot,
					"src/lib/mediapipe-pose-stub.ts",
				),
				"@mediapipe/drawing_utils": path.resolve(
					repoRoot,
					"src/lib/mediapipe-drawing-utils-stub.ts",
				),
			},
		},
		build: {
			outDir: path.resolve(__dirname, "dist"),
			target: "es2022",
			cssTarget: "es2020",
			sourcemap: !isProduction,
			rolldownOptions: {
				external: [],
				output: {
					// Rolldown rc.12 codeSplitting — substitui rollupOptions.manualChunks
					// que não funciona corretamente com Rolldown (quebra named exports).
					// Priority: maior = avaliado primeiro (chunk mais específico vence).
					codeSplitting: {
						groups: [
							// @cornerstonejs — viewer DICOM, ~2.8 MB total, muda raramente
							{
								name: "vendor-cornerstone",
								test: /node_modules\/@cornerstonejs/,
								priority: 30,
							},
							// react-pdf + pdfjs-dist — renderização PDF, ~1.5 MB
							{
								name: "vendor-react-pdf",
								test: /node_modules\/(@react-pdf|react-pdf|pdfjs-dist)/,
								priority: 25,
							},
							// @tiptap + prosemirror + tippy.js — editor rico, ~424 KB
							{
								name: "vendor-tiptap",
								test: /node_modules\/(@tiptap|prosemirror|tippy)/,
								priority: 22,
							},
							// @tensorflow + pose-detection — IA/biomecânica, ~693 KB
							{
								name: "vendor-tensorflow",
								test: /node_modules\/(@tensorflow|pose-detection)/,
								priority: 20,
							},
							// exceljs — exportação planilhas, ~930 KB
							{
								name: "vendor-exceljs",
								test: /node_modules\/exceljs/,
								priority: 18,
							},
							// jspdf — geração PDF, ~400 KB
							{
								name: "vendor-jspdf",
								test: /node_modules\/jspdf/,
								priority: 17,
							},
							// @sentry/react — error tracking, ~441 KB
							{
								name: "vendor-sentry",
								test: /node_modules\/@sentry/,
								priority: 16,
							},
							// @radix-ui — primitives usadas em boa parte do app, mas separadas do core React
							{
								name: "vendor-radix",
								test: /node_modules\/@radix-ui/,
								priority: 15,
							},
							// framer-motion — animações carregadas sob demanda em várias telas
							{
								name: "vendor-motion",
								test: /node_modules\/(framer-motion|motion-utils|@motionone)/,
								priority: 14,
							},
							// recharts — gráficos dashboard
							{
								name: "vendor-charts",
								test: /node_modules\/recharts/,
								priority: 13,
							},
							// react + react-dom — runtime base do app
							{
								name: "vendor-react",
								test: /node_modules\/(react|react-dom)/,
								priority: 10,
							},
						],
					},
				},
				// experimental: {
				//   minify: true, // Rolldown built-in minifier — habilitar quando Vite 8.1 estabilizar
				//                 // substitui esbuild/oxc minify, ~2x mais rápido
				// },
			},
		},
		optimizeDeps: {
			include: [
				"react",
				"react-dom",
				"framer-motion",
				"react-router-dom",
				"@tanstack/react-query",
				"@dnd-kit/core",
				"@dnd-kit/sortable",
				"@dnd-kit/utilities",
				"date-fns",
			],
			// Módulos IIFE/UMD: não pré-bundlar (side-effect imports no código-fonte)
			exclude: ["@mediapipe/drawing_utils", "@mediapipe/pose"],
		},
		server: {
			port: 5173,
			strictPort: false,
			forwardConsole: process.env.VITE_FORWARD_CONSOLE === "true",
			fs: {
				allow: [repoRoot],
			},
			watch: {
				ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**", "**/*.log"],
			},
		},
	};
});
