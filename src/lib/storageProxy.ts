/**
 * Utility functions for proxying Media Storage URLs
 * Updated for Cloudflare R2 / Neon Stack
 */

const LEGACY_STORAGE_PATTERN = /https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?]+)/;

type ImageFormat = 'auto' | 'webp' | 'avif' | 'jpg' | 'jpeg' | 'png';
type ImageFit = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

export interface ImageParams {
    width?: number;
    height?: number;
    quality?: number;
    format?: ImageFormat;
    fit?: ImageFit;
    dpr?: number;
}

/**
 * Convert a Storage URL to a proxy URL if necessary
 */
export function convertToProxyUrl(storageUrl: string | null | undefined): string {
    if (!storageUrl) return '';
    
    // We keep the pattern check just in case legacy URLs still exist in the DB
    const match = storageUrl.match(LEGACY_STORAGE_PATTERN);
    if (match) {
        // Legacy storage URL detection - can be used to trigger migration alerts
        return storageUrl;
    }

    // Default: return URL as is (assumed to be R2 or signed Cloudflare URL)
    return storageUrl;
}

/**
 * Convert multiple Storage URLs to proxy URLs
 */
export function convertMultipleToProxyUrls(storageUrls: string[]): string[] {
    if (!storageUrls || !Array.isArray(storageUrls)) return [];
    return storageUrls.map(url => convertToProxyUrl(url));
}

export function withImageParams(storageUrl: string | null | undefined, params: ImageParams = {}): string {
    const normalizedUrl = convertToProxyUrl(storageUrl);
    if (!normalizedUrl) return '';

    try {
        const url = new URL(normalizedUrl, window.location.origin);
        if (params.width) url.searchParams.set('w', String(params.width));
        if (params.height) url.searchParams.set('h', String(params.height));
        if (params.quality) url.searchParams.set('q', String(params.quality));
        if (params.format) url.searchParams.set('format', params.format);
        if (params.fit) url.searchParams.set('fit', params.fit);
        if (params.dpr) url.searchParams.set('dpr', String(params.dpr));
        return url.toString();
    } catch {
        return normalizedUrl;
    }
}

export function buildImageSrcSet(storageUrl: string | null | undefined, params: ImageParams = {}): string {
    const normalizedUrl = convertToProxyUrl(storageUrl);
    if (!normalizedUrl) return '';

    const oneX = withImageParams(normalizedUrl, { ...params, dpr: 1 });
    const twoX = withImageParams(normalizedUrl, { ...params, dpr: 2 });
    return `${oneX} 1x, ${twoX} 2x`;
}
