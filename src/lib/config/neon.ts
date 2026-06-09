// Same-origin reverse proxy path served by the fisioflow-web asset worker
// (`apps/web/src/asset-worker.ts`). Routing Neon Auth through our own origin
// makes its session cookies first-party instead of third-party.
export const SAME_ORIGIN_NEON_AUTH_PATH = "/__neon-auth";

// Production default: the same-origin proxy. Resolved to an absolute URL in the
// browser (see getNeonAuthUrl). An explicit VITE_NEON_AUTH_URL still wins, so
// staging/dev keep pointing at their own Neon Auth backend directly.
export const DEFAULT_PRODUCTION_NEON_AUTH_URL = SAME_ORIGIN_NEON_AUTH_PATH;

function normalizeNeonAuthUrl(url: string | undefined): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, "");
}

export function getNeonAuthUrl(): string | undefined {
  const configuredUrl = normalizeNeonAuthUrl(
    import.meta.env.VITE_NEON_AUTH_URL as string | undefined,
  );
  if (configuredUrl) return configuredUrl;

  if (import.meta.env.PROD) {
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}${SAME_ORIGIN_NEON_AUTH_PATH}`;
    }
    return SAME_ORIGIN_NEON_AUTH_PATH;
  }

  return undefined;
}

export function isNeonAuthConfigured(): boolean {
  return !!getNeonAuthUrl();
}
