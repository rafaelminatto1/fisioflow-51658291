import { OptimizedImage } from './OptimizedImage';
import { getOptimizedImageUrlWithPreset, IMAGE_PRESETS, type ImagePreset } from '@/lib/media/image';

interface OptimizedSupabaseImageProps {
    bucket: string;
    path: string;
    alt: string;
    preset?: ImagePreset;
    aspectRatio?: '1:1' | '4:3' | '16:9' | '3:2' | 'auto';
    className?: string;
    priority?: boolean;
}

/**
 * Componente otimizado para imagens do Supabase Storage.
 * Usa automaticamente Supabase Image Transformations para reduzir o tamanho da imagem.
 *
 * @example
 * <OptimizedSupabaseImage
 *   bucket="avatars"
 *   path="user_123/avatar.jpg"
 *   alt="Avatar do usuário"
 *   preset="avatar"
 *   aspectRatio="1:1"
 * />
 */
export function OptimizedSupabaseImage({
    bucket,
    path,
    alt,
    preset = 'card',
    aspectRatio = 'auto',
    className,
    priority = false,
}: OptimizedSupabaseImageProps) {
    const src = getOptimizedImageUrlWithPreset(bucket, path, preset);

    return (
        <OptimizedImage
            src={src}
            alt={alt}
            aspectRatio={aspectRatio}
            className={className}
            priority={priority}
        />
    );
}

export default OptimizedSupabaseImage;
