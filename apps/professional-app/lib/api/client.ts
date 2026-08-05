/**
 * Mantido como ponto de entrada dos módulos de `lib/api/*`.
 * A implementação vive em `lib/http.ts` — uma só, com fila offline.
 */

export { config } from "../config";
export { getToken } from "../token-storage";
export { ApiError, cleanRequestData, fetchApi } from "../http";
export type { FetchOptions } from "../http";
