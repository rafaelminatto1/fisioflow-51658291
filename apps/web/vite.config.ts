import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import Icons from "unplugin-icons/vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import Inspect from "vite-plugin-inspect";
import checker from "vite-plugin-checker";

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

export default defineConfig(({ mode }) => {
	const isProduction = mode === "production";
	const isAnalyze = process.env.ANALYZE === "true";
	const enableImageOptimizer = process.env.ENABLE_IMAGE_OPTIMIZER === "1";
	const buildTime = Date.now().toString();
	const VERSION_SUFFIX = "-v2.6.0-vite8.0.9-tsconfigPaths";
	const appVersion =
		(process.env.GIT_COMMIT_SHA || process.env.VITE_APP_VERSION || buildTime) +
		VERSION_SUFFIX;

	return {
		define: {
			__APP_VERSION__: JSON.stringify(appVersion),
			__BUILD_TIME__: JSON.stringify(buildTime),
			__CACHE_BUSTER__: JSON.stringify(buildTime),
			"import.meta.env.VITE_SCHEDULE_CALENDAR": JSON.stringify("fullcalendar"),
		},
		devtools: !isProduction,
		experimental: {
			bundledDev: true,
		},
		plugins: [
			tailwindcss(),
			react({
				babel: {
					plugins: [["babel-plugin-react-compiler", { target: "19" }]],
				},
			}),
			mockMobileModules(),
			htmlPlugin(appVersion, buildTime),
			VitePWA({
				strategies: "injectManifest",
				srcDir: "src",
				filename: "service-worker.ts",
				registerType: "autoUpdate",
				injectRegister: "auto",
				manifest: {
					name: "FisioFlow - Plataforma de Fisioterapia Digital",
					short_name: "FisioFlow",
					description: "Sistema completo de gestão para fisioterapeutas",
					theme_color: "#0ea5e9",
					background_color: "#ffffff",
					display: "standalone",
					orientation: "portrait-primary",
					scope: "/",
					start_url: "/",
					icons: [
						{
							src: "/icons/badge-72x72.svg",
							sizes: "72x72",
							type: "image/svg+xml",
							purpose: "any",
						},
						{
							src: "/icons/icon-192x192.svg",
							sizes: "192x192",
							type: "image/svg+xml",
							purpose: "any",
						},
						{
							src: "/icons/icon-512x512.svg",
							sizes: "512x512",
							type: "image/svg+xml",
							purpose: "any",
						},
					],
				},
				injectManifest: {
					globPatterns: ["**/*.{js,css,html,ico,png,svg,avif,woff2}"],
					maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
				},
				devOptions: {
					enabled: false,
					type: "module",
				},
			}),
			Icons({
				compiler: "jsx",
				autoInstall: true,
			}),
			enableImageOptimizer &&
				ViteImageOptimizer({
					png: { quality: 80 },
					jpeg: { quality: 75 },
					webp: { lossy: true, quality: 80 },
					avif: { lossy: true, quality: 70 },
					svg: {
						plugins: [
							{ name: "removeViewBox", active: false },
							{ name: "sortAttrs" },
						],
					},
				}),
			!isProduction && Inspect(),
			!isProduction &&
				checker({
					typescript: {
						tsconfigPath: "./tsconfig.json",
					},
					overlay: false,
				}),
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
			tsconfigPaths: true,
			dedupe: [
				"react",
				"react-dom",
				"framer-motion",
				"scheduler",
				"temporal-polyfill",
				"date-fns",
				"@tanstack/react-query",
			],
			alias: {
				"@fisioflow/ui": path.resolve(repoRoot, "packages/ui/src"),
				"@fisioflow/core": path.resolve(repoRoot, "packages/core/src"),
				"@fisioflow/skills": path.resolve(repoRoot, "src/lib/skills"),
				lodash: "lodash-es",
				exceljs: path.resolve(
					repoRoot,
					"node_modules/exceljs/lib/exceljs.browser.js",
				),
				"react-grid-layout/dist/legacy": path.resolve(
					repoRoot,
					"node_modules/react-grid-layout/dist/legacy.mjs",
				),
				globalthis: "globalthis",
				fs: path.resolve(__dirname, "src/lib/node-stub.ts"),
				path: path.resolve(__dirname, "src/lib/node-stub.ts"),
				crypto: path.resolve(__dirname, "src/lib/node-stub.ts"),
				stream: path.resolve(__dirname, "src/lib/node-stub.ts"),
				util: path.resolve(__dirname, "src/lib/node-stub.ts"),
				"@mediapipe/pose": path.resolve(
					__dirname,
					"src/lib/mediapipe-pose-stub.ts",
				),
				"@mediapipe/drawing_utils": path.resolve(
					__dirname,
					"src/lib/mediapipe-drawing-utils-stub.ts",
				),
			},
		},
		build: {
			outDir: path.resolve(__dirname, "dist"),
			target: "es2022",
			cssTarget: "es2020",
			sourcemap: !isProduction,
			// vendor-image-editor é lazy (~978 KB gzip 277 KB) — só carrega ao abrir editor de imagem.
			// Aumentado para 1000 KB para suprimir warning de chunks lazy legítimos.
			chunkSizeWarningLimit: 1000,
			rolldownOptions: {
				external: [],
				output: {
					// Rolldown rc.12 codeSplitting — substitui rollupOptions.manualChunks
					// que não funciona corretamente com Rolldown (quebra named exports).
					// Priority: maior = avaliado primeiro (chunk mais específico vence).
					codeSplitting: {
						groups: [
							// react-pdf renderer — geração de PDFs por exportação
							{
								name: "vendor-react-pdf-font",
								test: /node_modules\/(fontkit|linebreak|is-url|emoji-regex-xs)/,
								priority: 29,
							},
							{
								name: "vendor-react-pdf-textkit",
								test: /node_modules\/(@react-pdf\/textkit|yoga-layout|queue)/,
								priority: 28.6,
							},
							{
								name: "vendor-react-pdf-images",
								test: /node_modules\/(@react-pdf\/image|@react-pdf\/png-js|jay-peg|crypto-js|browserify-zlib|vite-compatible-readable-stream)/,
								priority: 28.4,
							},
							{
								name: "vendor-react-pdf-pdfkit",
								test: /node_modules\/@react-pdf\/pdfkit/,
								priority: 28,
							},
							{
								name: "vendor-react-pdf-layout",
								test: /node_modules\/@react-pdf\/(layout|render|font|fns|primitives|types)/,
								priority: 27.5,
							},
							{
								name: "vendor-react-pdf-renderer",
								test: /node_modules\/@react-pdf/,
								priority: 27,
							},
							// pdfjs-dist + react-pdf viewer — visualização PDF
							{
								name: "vendor-pdfjs-viewer",
								test: /node_modules\/(react-pdf|pdfjs-dist)/,
								priority: 26,
							},
							// fallback legado para dependências restantes ligadas a PDF
							{
								name: "vendor-react-pdf",
								test: /node_modules\/(@react-pdf|react-pdf|pdfjs-dist)/,
								priority: 25,
							},
							// @tiptap + prosemirror + tippy.js — editor rico
							{
								name: "vendor-prosemirror",
								test: /node_modules\/prosemirror/,
								priority: 22.4,
							},
							{
								name: "vendor-tippy",
								test: /node_modules\/tippy/,
								priority: 22.3,
							},
							{
								name: "vendor-prosemirror",
								test: /node_modules\/prosemirror/,
								priority: 22.3,
							},
							{
								name: "vendor-tippy",
								test: /node_modules\/tippy/,
								priority: 22.2,
							},
							{
								name: "vendor-tiptap",
								test: /node_modules\/@tiptap/,
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
								name: "vendor-jspdf-autotable",
								test: /node_modules\/jspdf-autotable/,
								priority: 17.2,
							},
							{
								name: "vendor-jspdf",
								test: /node_modules\/jspdf/,
								priority: 17,
							},
							{
								name: "vendor-qrcode",
								test: /node_modules\/qrcode/,
								priority: 16.8,
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
							// react-filerobot-image-editor — lazy loaded, só entra quando usuário edita imagem
							{
								name: "vendor-image-editor",
								test: /node_modules\/(react-filerobot-image-editor|@scaleflex)/,
								priority: 15.5,
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
								test: /[\\/]node_modules[\\/](react|react-dom|react-reconciler|scheduler|temporal-polyfill|date-fns)[\\/]/,
								priority: 100,
							},
						],
					},
				},
			},
		},
		optimizeDeps: {
			include: [
				"react",
				"react-dom",
				"framer-motion",
				"react-router-dom",
				"@tanstack/react-query",
				"date-fns",
				"temporal-polyfill",
			],
			// Módulos IIFE/UMD: não pré-bundlar (side-effect imports no código-fonte)
			exclude: ["@mediapipe/drawing_utils", "@mediapipe/pose"],
		},
		envDir: "../../",
		server: {
			port: 5173,
			strictPort: false,
			proxy: {
				"/api": {
					target: "http://localhost:8787",
					changeOrigin: true,
				},
			},
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
