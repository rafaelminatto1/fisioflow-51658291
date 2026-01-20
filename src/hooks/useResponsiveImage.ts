import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseResponsiveImageOptions {
    bucket: string;
    path: string;
    baseWidth?: number;
    sizes?: number[];
}

/**
 * Hook para gerar srcset e sizes para imagens responsivas do Supabase
 *
 * @example
 * const { srcSet, sizes } = useResponsiveImage({
 *   bucket: 'avatars',
 *   path: 'user_123/avatar.jpg',
 *   baseWidth: 1200
 * });
 */
export function useResponsiveImage({
    bucket,
    path,
    baseWidth = 1200,
    sizes = [320, 640, 960, 1280, baseWidth]
}: UseResponsiveImageOptions) {
    const srcSet = useMemo(() => {
        if (!path) return '';

        return sizes
            .map(size => {
                const { data } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(path, {
                        transform: { width: size, quality: 75, resize: 'contain' }
                    });
                return `${data.publicUrl} ${size}w`;
            })
            .join(', ');
    }, [bucket, path, sizes]);

    // Sizes padrão para diferentes breakpoints
    const responsiveSizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

    return { srcSet, sizes: responsiveSizes };
}

/**
 * Hook simplificado para gerar apenas srcset (sem responsive sizes automáticos)
 */
export function useSrcSet(
    urls: { width: number; url: string }[]
): string {
    return useMemo(() => {
        return urls
            .map(({ width, url }) => `${url} ${width}w`)
            .join(', ');
    }, [urls]);
}
