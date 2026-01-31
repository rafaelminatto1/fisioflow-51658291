import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { fisioLogger as logger } from '@/lib/errors/logger';

type TransformOptions = {
    width?: number;
    height?: number;
    resize?: 'cover' | 'contain' | 'fill';
    quality?: number; // 20-100
    format?: 'avif' | 'webp' | 'jpg' | 'auto';
};

// Presets maintained for structure, though they won't transform on the fly with basic Firebase Storage
export const IMAGE_PRESETS = {
    avatar: { width: 64, height: 64, quality: 80, resize: 'cover' as const },
    thumbnail: { width: 320, height: 180, quality: 75, resize: 'cover' as const },
    card: { width: 400, height: 300, quality: 80, resize: 'cover' as const },
    full: { width: 1200, quality: 85, resize: 'contain' as const },
    original: { quality: 85, resize: 'contain' as const },
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

/**
 * Generates a URL for a Firebase Storage image.
 * Note: Firebase Storage does not support on-the-fly transformations like Supabase Pro.
 * For true optimization, consider using the "Resize Images" Firebase Extension.
 *
 * @param bucket - The storage bucket (e.g., 'avatars', 'exercises')
 * @param path - The file path within the bucket
 * @param _options - Transformation options (currently ignored in basic migration)
 */
export const getOptimizedImageUrl = async (
    bucket: string,
    path: string,
    _options: TransformOptions = IMAGE_PRESETS.card
): Promise<string> => {
    if (!path) return '';

    // If it's already a full URL, return as is
    if (path.startsWith('http')) return path;

    try {
        const storage = getStorage();
        // Firebase paths often include the bucket name in our new structure or are separate.
        // We'll assume the path is relative to the bucket or fully qualified within the storage root.
        const storageRef = ref(storage, path.startsWith(bucket) ? path : `${bucket}/${path}`);
        return await getDownloadURL(storageRef);
    } catch (error) {
        logger.error('Error getting image URL', error, 'image');
        return '';
    }
};

/**
 * Gera URL otimizada usando um preset pré-definido
 */
export const getOptimizedImageUrlWithPreset = async (
    bucket: string,
    path: string,
    preset: ImagePreset = 'card'
) => {
    return getOptimizedImageUrl(bucket, path, IMAGE_PRESETS[preset]);
};

/**
 * Gera URLs para diferentes tamanhos de imagem (para srcset)
 * Returns the same URL for all sizes in basic Firebase migration
 */
export const getResponsiveImageUrls = async (
    bucket: string,
    path: string,
    sizes: number[] = [320, 640, 960, 1280, 1920]
): Promise<Record<number, string>> => {
    if (!path) return {};

    const url = await getOptimizedImageUrl(bucket, path);
    const urls: Record<number, string> = {};
    for (const size of sizes) {
        urls[size] = url;
    }
    return urls;
};
