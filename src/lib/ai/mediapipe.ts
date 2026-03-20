export const MEDIAPIPE_TASKS_VISION_VERSION = "0.10.32";

const MEDIAPIPE_TASKS_VISION_WASM_BASE_URLS = [
	`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VISION_VERSION}/wasm`,
	`https://unpkg.com/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VISION_VERSION}/wasm`,
] as const;

type FilesetResolverLike = {
	forVisionTasks: (baseUrl: string) => Promise<unknown>;
};

export async function resolveMediaPipeVisionFileset(
	filesetResolver: FilesetResolverLike,
): Promise<unknown> {
	let lastError: unknown;

	for (const baseUrl of MEDIAPIPE_TASKS_VISION_WASM_BASE_URLS) {
		try {
			return await filesetResolver.forVisionTasks(baseUrl);
		} catch (error) {
			lastError = error;
		}
	}

	throw (
		lastError ?? new Error("Falha ao carregar WASM do MediaPipe Tasks Vision.")
	);
}
