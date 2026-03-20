import { fisioLogger as logger } from "@/lib/errors/logger";

declare global {
	interface Window {
		APP_CHECK_DEBUG_TOKEN?: boolean | string;
	}
}

export const initAppCheck = () => {
	logger.info(
		"App Check em modo compatível; validação nativa desativada.",
		null,
		"app-check",
	);
	return null;
};

export const getAppCheckToken = async (): Promise<string | undefined> => {
	return undefined;
};
