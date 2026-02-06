/**
 * Utility functions for proxying Firebase Storage URLs
 * This bypasses CORS issues by using a Cloud Function proxy
 */

const PROXY_BASE = '/api/exercise-image';
const FIREBASE_STORAGE_PATTERN = /https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?]+)/;

/**
 * Convert a Firebase Storage URL to a proxy URL
 * @param storageUrl - The Firebase Storage URL (e.g., https://firebasestorage.googleapis.com/v0/b/bucket/o/path?alt=media)
 * @returns The proxy URL (e.g., /api/exercise-image/path)
 */
export function toProxyUrl(storageUrl: string | null | undefined): string {
  if (!storageUrl) return '';

  // Reject local file paths (these are artifacts from AI generation, not valid URLs)
  if (storageUrl.startsWith('/brain/') || storageUrl.startsWith('/home/') || storageUrl.startsWith('/tmp/')) {
    console.warn('[storageProxy] Invalid local path detected, returning empty:', storageUrl);
    return '';
  }

  // Check if it's already a proxy URL
  if (storageUrl.startsWith(PROXY_BASE)) {
    return storageUrl;
  }

  // Check if it's a Firebase Storage URL
  const match = storageUrl.match(FIREBASE_STORAGE_PATTERN);
  if (match && match[1]) {
    // The encoded path looks like: exercise-media%2Fid%2Ffile.png
    // Decode it to: exercise-media/id/file.png
    const encodedPath = match[1];
    const decodedPath = decodeURIComponent(encodedPath);

    // Always remove the 'exercise-media/' prefix if present
    // The proxy expects: /api/exercise-image/id/filename
    const pathWithoutPrefix = decodedPath.startsWith('exercise-media/')
      ? decodedPath.substring('exercise-media/'.length)
      : decodedPath;

    return `${PROXY_BASE}/${pathWithoutPrefix}`;
  }

  // Not a Firebase Storage URL, return as-is
  return storageUrl;
}

/**
 * Convert multiple Firebase Storage URLs to proxy URLs
 * @param storageUrls - Array of Firebase Storage URLs
 * @returns Array of proxy URLs
 */
export function toProxyUrls(storageUrls: (string | null | undefined)[]): string[] {
  return storageUrls.map(toProxyUrl);
}

/**
 * Check if a URL is a Firebase Storage URL
 * @param url - The URL to check
 * @returns True if it's a Firebase Storage URL
 */
export function isFirebaseStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return FIREBASE_STORAGE_PATTERN.test(url);
}

/**
 * Get the original Firebase Storage URL from a proxy URL
 * @param proxyUrl - The proxy URL
 * @param bucket - The Firebase Storage bucket name
 * @returns The original Firebase Storage URL
 */
export function fromProxyUrl(proxyUrl: string, bucket = 'fisioflow-migration.firebasestorage.app'): string {
  if (!proxyUrl.startsWith(PROXY_BASE)) {
    return proxyUrl;
  }

  const path = proxyUrl.substring(PROXY_BASE.length + 1);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${path}?alt=media`;
}
