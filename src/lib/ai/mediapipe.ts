export const MEDIAPIPE_TASKS_VISION_VERSION = "0.10.32";
export const MEDIAPIPE_LOCAL_WASM_PATH = "mediapipe/wasm";

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function joinBasePath(base: string, segment: string): string {
  const normalizedBase = base === "/" ? "" : trimSlashes(base);
  const normalizedSegment = trimSlashes(segment);

  return normalizedBase ? `/${normalizedBase}/${normalizedSegment}` : `/${normalizedSegment}`;
}

export function getMediaPipeVisionWasmBaseUrls(): readonly string[] {
  const localBaseUrl = joinBasePath(import.meta.env.BASE_URL || "/", MEDIAPIPE_LOCAL_WASM_PATH);

  return [
    localBaseUrl,
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VISION_VERSION}/wasm`,
    `https://unpkg.com/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VISION_VERSION}/wasm`,
  ] as const;
}

type FilesetResolverLike = {
  forVisionTasks: (baseUrl: string) => Promise<unknown>;
};

export async function resolveMediaPipeVisionFileset(
  filesetResolver: FilesetResolverLike,
): Promise<unknown> {
  let lastError: unknown;

  for (const baseUrl of getMediaPipeVisionWasmBaseUrls()) {
    try {
      return await filesetResolver.forVisionTasks(baseUrl);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Falha ao carregar WASM do MediaPipe Tasks Vision.");
}
