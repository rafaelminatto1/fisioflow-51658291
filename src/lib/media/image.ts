import { supabase } from '@/integrations/supabase/client';

type TransformOptions = {
    width?: number;
    height?: number;
    resize?: 'cover' | 'contain' | 'fill';
    quality?: number; // 20-100
    format?: 'avif' | 'webp' | 'jpg' | 'auto';
};

// Presets de tamanho para otimização automática
export const IMAGE_PRESETS = {
    avatar: { width: 64, height: 64, quality: 80, resize: 'cover' as const },
    thumbnail: { width: 320, height: 180, quality: 75, resize: 'cover' as const },
    card: { width: 400, height: 300, quality: 80, resize: 'cover' as const },
    full: { width: 1200, quality: 85, resize: 'contain' as const },
    original: { quality: 85, resize: 'contain' as const },
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

/**
 * Generates a consistent, optimized URL for a Supabase Storage image.
 * Uses Supabase Pro Image Transformations for performance.
 *
 * @param bucket - The storage bucket (e.g., 'avatars', 'exercises')
 * @param path - The file path within the bucket
 * @param options - Transformation options (width, quality, etc.)
 */
export const getOptimizedImageUrl = (
    bucket: string,
    path: string,
    options: TransformOptions = IMAGE_PRESETS.card
) => {
    if (!path) return '';

    // If it's already a full URL (e.g. Vercel Blob or external), return as is
    if (path.startsWith('http')) return path;

    // Supabase Image Transformation
    const { data } = supabase.storage.from(bucket).getPublicUrl(path, {
        transform: {
            width: options.width,
            height: options.height,
            resize: options.resize,
            quality: options.quality,
        },
    });

    return data.publicUrl;
};

/**
 * Gera URL otimizada usando um preset pré-definido
 */
export const getOptimizedImageUrlWithPreset = (
    bucket: string,
    path: string,
    preset: ImagePreset = 'card'
) => {
    return getOptimizedImageUrl(bucket, path, IMAGE_PRESETS[preset]);
};

/**
 * Gera URLs para diferentes tamanhos de imagem (para srcset)
 */
export const getResponsiveImageUrls = (
    bucket: string,
    path: string,
    sizes: number[] = [320, 640, 960, 1280, 1920]
): Record<number, string> => {
    if (!path) return {};

    const urls: Record<number, string> = {};
    for (const size of sizes) {
        urls[size] = getOptimizedImageUrl(bucket, path, { width: size, quality: 75, resize: 'contain' });
    }
    return urls;
};
