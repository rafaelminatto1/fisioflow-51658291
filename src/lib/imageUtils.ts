/**
 * Utilitários para carregamento e manipulação de imagens de exercícios
 * Foca em performance, fallbacks robustos e tratamento de erros
 */

/**
 * Obtém a melhor URL de imagem disponível para um exercício
 * Prioridade: thumbnail_url > image_url > fallback
 */
export function getBestImageUrl(exercise: {
  thumbnail_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
}): string | null {
  // Prioridade 1: thumbnail (mais rápido, menor)
  if (exercise.thumbnail_url && isValidImageUrl(exercise.thumbnail_url)) {
    return exercise.thumbnail_url;
  }

  // Prioridade 2: image_url
  if (exercise.image_url && isValidImageUrl(exercise.image_url)) {
    return exercise.image_url;
  }

  // Prioridade 3: YouTube thumbnail (para vídeos do YouTube)
  if (exercise.video_url && isYouTubeUrl(exercise.video_url)) {
    return getYouTubeThumbnailUrl(exercise.video_url);
  }

  return null;
}

/**
 * Verifica se uma URL de imagem é válida
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  // Rejeitar caminhos locais inválidos
  if (trimmed.startsWith('/brain/') ||
    trimmed.startsWith('/home/') ||
    trimmed.startsWith('/tmp/') ||
    trimmed.startsWith('/api/')) {
    return false;
  }

  // Aceitar URLs HTTP/HTTPS, data: URLs e blob: URLs
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  );
}

/**
 * Verifica se uma URL é do YouTube
 */
export function isYouTubeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\//,
    /^https?:\/\/youtu\.be\//,
    /^https?:\/\/(www\.)?youtube\.com\/shorts\//,
  ];
  return patterns.some(pattern => pattern.test(url));
}

/**
 * Extrai o ID do YouTube de uma URL
 */
export function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Obtém a URL do thumbnail do YouTube de melhor qualidade
 */
export function getYouTubeThumbnailUrl(youtubeUrl: string): string | null {
  const videoId = getYouTubeId(youtubeUrl);
  if (!videoId) return null;

  // Prioridade de qualidade: maxresdefault > sddefault > hqdefault > mqdefault > default
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Prepara uma lista de URLs de imagem com fallbacks em ordem de preferência
 */
export function getImageUrlsWithFallbacks(exercise: {
  thumbnail_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
}): Array<{ url: string; type: 'thumbnail' | 'image' | 'youtube' }> {
  const result: Array<{ url: string; type: 'thumbnail' | 'image' | 'youtube' }> = [];

  if (exercise.thumbnail_url && isValidImageUrl(exercise.thumbnail_url)) {
    result.push({ url: exercise.thumbnail_url, type: 'thumbnail' });
  }

  if (exercise.image_url && isValidImageUrl(exercise.image_url)) {
    result.push({ url: exercise.image_url, type: 'image' });
  }

  if (exercise.video_url && isYouTubeUrl(exercise.video_url)) {
    const ytThumb = getYouTubeThumbnailUrl(exercise.video_url);
    if (ytThumb) {
      result.push({ url: ytThumb, type: 'youtube' });
    }
  }

  return result;
}

/**
 * Hook personalizado para gerenciar o estado de carregamento de imagem com fallback
 */
export function useImageWithFallback(exercise: {
  thumbnail_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
}) {
  const bestUrl = getBestImageUrl(exercise);
  const fallbackUrls = getImageUrlsWithFallbacks(exercise);

  return {
    primaryUrl: bestUrl,
    fallbackUrls,
    hasImage: bestUrl !== null,
  };
}

/**
 * Calcula o tamanho da imagem para diferentes breakpoints de tela
 */
export function getResponsiveImageSizes(
  columns: number = 3,
  minSize: number = 120,
  maxSize: number = 400
): string {
  // Exemplo: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  const breakpoints = [640, 768, 1024, 1280];
  const sizes: string[] = [];

  for (let i = 0; i < breakpoints.length; i++) {
    const bp = breakpoints[i];
    const vw = Math.round(100 / (i + 2));
    sizes.push(`(max-width: ${bp}px) ${vw}vw`);
  }

  sizes.push(`${Math.round(100 / columns)}vw`);
  return sizes.join(', ');
}

/**
 * Tipos de formato de imagem suportados pelo navegador
 */
export function getSupportedImageFormat(): 'avif' | 'webp' | 'jpeg' | 'png' {
  if (typeof document === 'undefined') return 'jpeg';

  // Verificar suporte a AVIF
  const avifTest = document.createElement('canvas');
  avifTest.width = 1;
  avifTest.height = 1;
  if (avifTest.toDataURL('image/avif').includes('data:image/avif')) {
    return 'avif';
  }

  // Verificar suporte a WebP
  if (document.createElement('canvas').toDataURL('image/webp').includes('data:image/webp')) {
    return 'webp';
  }

  // Fallback para JPEG
  return 'jpeg';
}
