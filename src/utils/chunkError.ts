/**
 * Chunk Error Detection & Recovery Utility
 * 
 * Handles errors related to dynamic imports and failed bundle fetches (common after deployments).
 */

import { fisioLogger as logger } from "@/lib/errors/logger";

/**
 * Checks if an error is a chunk loading error.
 */
export const isChunkLoadError = (error: unknown): boolean => {
	const message =
		typeof error === "string"
			? error
			: typeof error === "object" &&
				  error !== null &&
				  "message" in error &&
				  typeof error.message === "string"
				? error.message
				: "";
	
	return (
		/Loading chunk/i.test(message) ||
		/Loading CSS chunk/i.test(message) ||
		/Failed to fetch dynamically imported module/i.test(message) ||
		/Importing a module script failed/i.test(message) ||
		/error loading dynamically imported module/i.test(message) ||
		/Failed to fetch/i.test(message) && (message.includes(".js") || message.includes(".css"))
	);
};

/**
 * Recarrega a página se for um erro de chunk, com proteção contra loops infinitos.
 */
export const handleChunkError = (error: unknown, source: string): boolean => {
	if (!isChunkLoadError(error)) return false;

	const reloadCountKey = "fisio_chunk_reload_count";
	const lastReloadKey = "fisio_chunk_last_reload";
	const now = Date.now();
	
	const reloadCount = parseInt(sessionStorage.getItem(reloadCountKey) || "0", 10);
	const lastReload = parseInt(sessionStorage.getItem(lastReloadKey) || "0", 10);

	// Se a última recarga foi há mais de 30 segundos, resetamos o contador para permitir novas tentativas
	// (Ex: se o usuário ficou muito tempo com a aba aberta e houve múltiplos deploys)
	if (now - lastReload > 30000) {
		sessionStorage.setItem(reloadCountKey, "0");
	}

	if (reloadCount < 3) {
		sessionStorage.setItem(reloadCountKey, (reloadCount + 1).toString());
		sessionStorage.setItem(lastReloadKey, now.toString());
		
		logger.warn(`[Vite] Erro de carregamento de chunk detectado via ${source}. Recarregando (tentativa ${reloadCount + 1}/3)...`, {
			error,
			source,
			reloadCount: reloadCount + 1
		}, "ChunkError");

		// Pequeno delay para garantir que o log seja enviado se necessário
		setTimeout(() => {
			window.location.reload();
		}, 500);
		
		return true;
	} 

	logger.error(`[Vite] Limite de recargas por erro de chunk atingido (${source}).`, {
		error,
		source
	}, "ChunkError");
	
	return false;
};
