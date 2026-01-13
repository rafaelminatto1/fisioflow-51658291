import { supabase } from '@/integrations/supabase/client';

type TransformOptions = {
    width?: number;
    height?: number;
    resize?: 'cover' | 'contain' | 'fill';
    quality?: number; // 20-100
};

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
    options: TransformOptions = { width: 500, quality: 80, resize: 'cover' }
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
