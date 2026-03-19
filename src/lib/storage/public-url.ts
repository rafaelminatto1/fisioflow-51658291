const R2_PUBLIC_DOMAIN = import.meta.env.VITE_R2_PUBLIC_DOMAIN || 'https://media.moocafisio.com.br';

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

export function normalizePublicStorageUrl(path: string | null | undefined): string {
  if (!path) return '';

  try {
    const url = new URL(path);
    if (url.hostname.endsWith('.r2.dev')) {
      return `${R2_PUBLIC_DOMAIN}${url.pathname}`;
    }
    return url.toString();
  } catch {
    return resolvePublicStorageUrl(path);
  }
}

export function resolvePublicStorageUrl(path: string | null | undefined, bucketName?: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return normalizePublicStorageUrl(path);
  if (path.startsWith('/')) return path;

  const normalizedPath = trimSlashes(path);
  const normalizedBucket = trimSlashes(bucketName ?? '');
  const key = normalizedBucket && !normalizedPath.startsWith(`${normalizedBucket}/`)
    ? `${normalizedBucket}/${normalizedPath}`
    : normalizedPath;

  return `${R2_PUBLIC_DOMAIN}/${key}`;
}
