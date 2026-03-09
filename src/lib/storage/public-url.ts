const R2_PUBLIC_DOMAIN = import.meta.env.VITE_R2_PUBLIC_DOMAIN || 'https://media.moocafisio.com.br';

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

export function resolvePublicStorageUrl(path: string | null | undefined, bucketName?: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return path;

  const normalizedPath = trimSlashes(path);
  const normalizedBucket = trimSlashes(bucketName ?? '');
  const key = normalizedBucket && !normalizedPath.startsWith(`${normalizedBucket}/`)
    ? `${normalizedBucket}/${normalizedPath}`
    : normalizedPath;

  return `${R2_PUBLIC_DOMAIN}/${key}`;
}
