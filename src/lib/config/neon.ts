export const DEFAULT_PRODUCTION_NEON_AUTH_URL =
  "https://ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1.aws.neon.tech/neondb/auth";

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
    return DEFAULT_PRODUCTION_NEON_AUTH_URL;
  }

  return undefined;
}

export function isNeonAuthConfigured(): boolean {
  return !!getNeonAuthUrl();
}
