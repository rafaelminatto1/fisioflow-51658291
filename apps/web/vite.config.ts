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
				preact: "react",
				"preact/hooks": "react",
				"preact/compat": "react",
				"preact/jsx-runtime": "react/jsx-runtime",
				"@fisioflow/cornerstone-tools-init": path.resolve(
					repoRoot,
					"node_modules/@cornerstonejs/tools/dist/esm/init.js",
				),
				"@fisioflow/cornerstone-tools-add-tool": path.resolve(
					repoRoot,
					"node_modules/@cornerstonejs/tools/dist/esm/store/addTool.js",
				),
				"@fisioflow/cornerstone-tools-tool-group-manager": path.resolve(
					repoRoot,
					"node_modules/@cornerstonejs/tools/dist/esm/store/ToolGroupManager/index.js",
				),
				"@fisioflow/cornerstone-tools-enums": path.resolve(
					repoRoot,
					"node_modules/@cornerstonejs/tools/dist/esm/enums/index.js",
				),
				"@fisioflow/cornerstone-tools-pan": path.resolve(
					repoRoot,
					"node_modules/@cornerstonejs/tools/dist/esm/tools/PanTool.js",
				),
				"@fisioflow/cornerstone-tools-zoom": path.resolve(
					repoRoot,
					"node_modules/@cornerstonejs/tools/dist/esm/tools/ZoomTool.js",
				),
				"@fisioflow/cornerstone-tools-length": path.resolve(
					repoRoot,
					"node_modules/@cornerstonejs/tools/dist/esm/tools/annotation/LengthTool.js",
				),
				"@fisioflow/cornerstone-tools-probe": path.resolve(
					repoRoot,
					"node_modules/@cornerstonejs/tools/dist/esm/tools/annotation/ProbeTool.js",
				),
				exceljs: path.resolve(
					repoRoot,
					"node_modules/exceljs/lib/exceljs.browser.js",
				),
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
							// DICOM viewer split — evita um único megachunk monolítico
							{
								name: "vendor-vtk",
								test: /node_modules\/@kitware\/vtk\.js/,
								priority: 34.7,
							},
							{
								name: "vendor-cornerstone-math",
								test: /node_modules\/(gl-matrix|comlink|loglevel)/,
								priority: 34.6,
							},
							{
								name: "vendor-cornerstone-core",
								test: /node_modules\/@cornerstonejs\/core/,
								priority: 34,
							},
							{
								name: "vendor-cornerstone-tools",
								test: /node_modules\/@cornerstonejs\/tools/,
								priority: 33,
							},
							{
								name: "vendor-cornerstone-loader",
								test: /node_modules\/@cornerstonejs\/dicom-image-loader/,
								priority: 32,
							},
							// fallback para qualquer outro pacote cornerstone
							{
								name: "vendor-cornerstone",
								test: /node_modules\/@cornerstonejs/,
								priority: 30,
							},
							// react-pdf renderer — geração de PDFs por exportação
							{
								name: "vendor-react-pdf-renderer-consolidated",
								test: /node_modules\/(@react-pdf|fontkit|linebreak|is-url|emoji-regex-xs|yoga-layout|queue|jay-peg|vite-compatible-readable-stream|crypto-js|browserify-zlib|pako|base64-js|ieee754)/,
								priority: 25,
							},
							// pdfjs-dist + react-pdf viewer — visualização PDF
							{
								name: "vendor-pdfjs-viewer",
								test: /node_modules\/(react-pdf|pdfjs-dist)/,
								priority: 24,
							},
							// @tiptap + prosemirror + tippy.js — editor rico, ~424 KB
							{
								name: "vendor-tiptap",
								test: /node_modules\/(@tiptap|prosemirror|tippy)/,
								priority: 22,
							},
							// @tensorflow + pose-detection — IA/biomecânica, ~693 KB
							{
								name: "vendor-tfjs-core",
								test: /node_modules\/@tensorflow\/tfjs-core/,
								priority: 23,
							},
							{
								name: "vendor-tfjs-webgl",
								test: /node_modules\/@tensorflow\/tfjs-backend-webgl/,
								priority: 22.8,
							},
							{
								name: "vendor-tfjs-backend-cpu",
								test: /node_modules\/@tensorflow\/tfjs-backend-cpu/,
								priority: 22.75,
							},
							{
								name: "vendor-tfjs-layers",
								test: /node_modules\/@tensorflow\/tfjs-layers/,
								priority: 22.7,
							},
							{
								name: "vendor-tfjs-data",
								test: /node_modules\/@tensorflow\/tfjs-data/,
								priority: 22.65,
							},
							{
								name: "vendor-tfjs-converter-core",
								test: /node_modules\/@tensorflow\/tfjs-converter/,
								priority: 22.62,
							},
							{
								name: "vendor-tfjs-converter",
								test: /node_modules\/@tensorflow\/(tfjs-converter|tfjs-layers|tfjs-data|tfjs-backend-cpu|tfjs)/,
								priority: 22.6,
							},
							{
								name: "vendor-pose-detection",
								test: /node_modules\/(@tensorflow-models\/pose-detection|pose-detection)/,
								priority: 22.4,
							},
							{
								name: "vendor-tensorflow",
								test: /node_modules\/(@tensorflow|pose-detection)/,
								priority: 20,
							},
							// exceljs — exportação planilhas, ~930 KB
							{
								name: "vendor-exceljs-zip",
								test: /node_modules\/(jszip|archiver|unzipper)/,
								priority: 19,
							},
							{
								name: "vendor-exceljs-streams",
								test: /node_modules\/(readable-stream|fast-csv|saxes|tmp|uuid|dayjs)/,
								priority: 18.5,
							},
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
								name: "vendor-sentry-replay",
								test: /node_modules\/@sentry\/(replay-internal|replay-canvas|browser)/,
								priority: 16.4,
							},
							{
								name: "vendor-sentry-core",
								test: /node_modules\/@sentry\/(core|utils|react)/,
								priority: 16.2,
							},
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
							// react-router — navegação e data routers
							{
								name: "vendor-router",
								test: /node_modules\/(react-router|react-router-dom|@remix-run\/router)/,
								priority: 12.6,
							},
							// react-query + persistência
							{
								name: "vendor-query",
								test: /node_modules\/@tanstack\/(react-query|query-core|react-query-persist-client|query-async-storage-persister)/,
								priority: 12.5,
							},
							// react-hook-form + resolvers
							{
								name: "vendor-forms",
								test: /node_modules\/(react-hook-form|@hookform\/resolvers)/,
								priority: 12.4,
							},
							// dnd-kit agenda/boards
							{
								name: "vendor-dnd",
								test: /node_modules\/@dnd-kit\//,
								priority: 12.3,
							},
							// estado local leve
							{
								name: "vendor-state",
								test: /node_modules\/zustand/,
								priority: 12.2,
							},
							// command palette, calendários e toasts
							{
								name: "vendor-ui-helpers",
								test: /node_modules\/(cmdk|sonner|react-day-picker)/,
								priority: 12.1,
							},
							// react + react-dom — runtime base do app (prioridade máxima absoluta)
							{
								name: "vendor-react",
								test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-sync-external-store)[\\/]/,
								priority: 100,
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
				"@react-pdf/renderer",
				"yoga-layout",
				"@dnd-kit/core",
				"@dnd-kit/sortable",
				"@dnd-kit/utilities",
				"date-fns",
			"@schedule-x/calendar",
			"@schedule-x/react",
			"@schedule-x/calendar-controls",
			"@schedule-x/drag-and-drop",
			"@schedule-x/theme-default",
			"temporal-polyfill",
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
