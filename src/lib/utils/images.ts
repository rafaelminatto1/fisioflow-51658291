/**
 * Utilitário para gerar URLs de imagens otimizadas via Cloudflare Workers
 */

interface ImageTransformOptions {
	width?: number;
	height?: number;
	fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
	quality?: number;
}

/**
 * Constrói a URL para o processador de imagens do Worker.
 *
 * @param key - Chave do arquivo no R2 (ex: 'pacientes/foto.jpg')
 * @param options - Opções de redimensionamento
 * @returns URL formatada
 */
export function getOptimizedImageUrl(
	key: string,
	options: ImageTransformOptions = {},
): string {
	if (!key) return "";

	// Se for uma URL completa externa, podemos passar como key também
	const baseUrl = import.meta.env.VITE_WORKERS_API_URL + "/api/exercise-image";
	const url = new URL(
		`${baseUrl}/${key.startsWith("http") ? encodeURIComponent(key) : key}`,
	);

	if (options.width) url.searchParams.set("w", options.width.toString());
	if (options.height) url.searchParams.set("h", options.height.toString());
	if (options.fit) url.searchParams.set("fit", options.fit);
	if (options.quality) url.searchParams.set("q", options.quality.toString());

	return url.toString();
}

/**
 * Atalhos úteis para o FisioFlow
 */
export const ImagePresets = {
	AVATAR: { width: 100, height: 100, fit: "cover" as const, quality: 80 },
	THUMBNAIL: { width: 300, height: 200, fit: "cover" as const, quality: 75 },
	EXERCISE_PREVIEW: {
		width: 600,
		height: 400,
		fit: "contain" as const,
		quality: 85,
	},
};
