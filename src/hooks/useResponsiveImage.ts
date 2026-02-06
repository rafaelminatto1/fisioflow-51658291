import { useMemo } from 'react';
import { getStorage, ref } from 'firebase/storage';
import { getFirebaseApp } from '@/integrations/firebase/app';

interface UseResponsiveImageOptions {
    bucket: string;
    path: string;
    baseWidth?: number;
    sizes?: number[];
}

/**
 * Hook para gerar srcset e sizes para imagens responsivas do Firebase Storage
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

        const app = getFirebaseApp();
        const storage = getStorage(app);

        return sizes
            .map(size => {
                // Firebase Storage doesn't support server-side transformations like Supabase
                // We create a reference that can be used with Firebase Image Resizer or similar
                const storageRef = ref(storage, `${bucket}/${path}`);
                // Note: For responsive images, you'd need to implement Firebase Cloud Functions
                // with Firebase Image Resizer or use a CDN like Cloudinary
                const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${storageRef.bucket}/o/${encodeURIComponent(storageRef.fullPath)}?alt=media`;
                return `${publicUrl} ${size}w`;
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
