/**
 * Image Optimization Utility
 *
 * Funções para compressão, redimensionamento e otimização de imagens.
 * Usa expo-image-manipulator para processamento local.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Opções de compressão de imagem
 */
export interface CompressionOptions {
  /**
   * Qualidade da compressão (0-100)
   * Padrão: 80 para bom equilíbrio
   */
  quality?: number;

  /**
   * Largura máxima
   * Padrão: 1920px
   */
  maxWidth?: number;

  /**
   * Altura máxima
   * Padrão: 1920px
   */
  maxHeight?: number;

  /**
   * Formato de saída
   * Padrão: JPEG (melhor compressão)
   */
  format?: 'jpeg' | 'png' | 'webp';

  /**
   * Preset de qualidade
   */
  preset?: 'low' | 'medium' | 'high' | 'ultra';
}

/**
 * Informações de uma imagem
 */
export interface ImageInfo {
  uri: string;
  width: number;
  height: number;
  size: number; // bytes
  format: string;
}

/**
 * Presets de compressão
 */
export const COMPRESSION_PRESETS: Record<string, CompressionOptions> = {
  low: {
    quality: 60,
    maxWidth: 1024,
    maxHeight: 1024,
    format: 'jpeg',
  },
  medium: {
    quality: 75,
    maxWidth: 1536,
    maxHeight: 1536,
    format: 'jpeg',
  },
  high: {
    quality: 85,
    maxWidth: 2048,
    maxHeight: 2048,
    format: 'jpeg',
  },
  ultra: {
    quality: 95,
    maxWidth: 3072,
    maxHeight: 3072,
    format: 'jpeg',
  },
};

/**
 * Opções padrão para diferentes casos de uso
 */
export const DEFAULT_OPTIONS: Record<string, CompressionOptions> = {
  avatar: {
    quality: 85,
    maxWidth: 512,
    maxHeight: 512,
    format: 'jpeg',
  },
  thumbnail: {
    quality: 80,
    maxWidth: 256,
    maxHeight: 256,
    format: 'jpeg',
  },
  document: {
    quality: 90,
    maxWidth: 2048,
    maxHeight: 2048,
    format: 'jpeg',
  },
  medical: {
    quality: 95,
    maxWidth: 3072,
    maxHeight: 3072,
    format: 'jpeg',
  },
  gallery: {
    quality: 80,
    maxWidth: 1920,
    maxHeight: 1920,
    format: 'jpeg',
  },
};

/**
 * Obtém informações de uma imagem
 */
export async function getImageInfo(uri: string): Promise<ImageInfo> {
  const info = await FileSystem.getInfoAsync(uri, { size: true, md5: false });

  // Para obter dimensões, precisamos usar ImageManipulator
  const manipResult = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 1,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return {
    uri,
    width: manipResult.width,
    height: manipResult.height,
    size: info.size || 0,
    format: uri.split('.').pop() || 'jpg',
  };
}

/**
 * Comprime uma imagem
 */
export async function compressImage(
  uri: string,
  options: CompressionOptions = {}
): Promise<string> {
  let finalOptions = { ...options };

  // Aplica preset se fornecido
  if (options.preset) {
    finalOptions = { ...COMPRESSION_PRESETS[options.preset], ...options };
  }

  // Valores padrão
  const quality = finalOptions.quality ?? 80;
  const maxWidth = finalOptions.maxWidth ?? 1920;
  const maxHeight = finalOptions.maxHeight ?? 1920;
  const format = finalOptions.format ?? 'jpeg';

  // Obtém informações da imagem
  const info = await getImageInfo(uri);

  // Calcula as dimensões mantendo aspect ratio
  const aspectRatio = info.width / info.height;
  let newWidth = info.width;
  let newHeight = info.height;

  if (newWidth > maxWidth) {
    newWidth = maxWidth;
    newHeight = newWidth / aspectRatio;
  }

  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = newHeight * aspectRatio;
  }

  // Formato de saída
  const saveFormat =
    format === 'png'
      ? ImageManipulator.SaveFormat.PNG
      : format === 'webp'
        ? ImageManipulator.SaveFormat.WEBP
        : ImageManipulator.SaveFormat.JPEG;

  try {
    // Comprime a imagem
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: Math.round(newWidth),
            height: Math.round(newHeight),
          },
        },
      ],
      {
        compress: quality / 100,
        format: saveFormat,
        base64: false,
      }
    );

    // Se a URI mudou, exclui a original
    if (result.uri !== uri && uri.startsWith('file://')) {
      try {
        await FileSystem.deleteAsync(uri);
      } catch (error) {
        console.warn('[ImageOptimization] Não foi possível excluir a imagem original:', error);
      }
    }

    return result.uri;
  } catch (error) {
    console.error('[ImageOptimization] Erro ao comprimir imagem:', error);
    throw error;
  }
}

/**
 * Comprime múltiplas imagens em paralelo
 */
export async function compressMultipleImages(
  uris: string[],
  options: CompressionOptions = {}
): Promise<string[]> {
  return Promise.all(uris.map((uri) => compressImage(uri, options)));
}

/**
 * Cria uma miniatura de imagem
 */
export async function createThumbnail(
  uri: string,
  size: number = 256,
  quality: number = 80
): Promise<string> {
  return compressImage(uri, {
    maxWidth: size,
    maxHeight: size,
    quality,
    format: 'jpeg',
  });
}

/**
 * Converte uma imagem para base64
 */
export async function imageToBase64(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return base64;
}

/**
 * Salva base64 como arquivo
 */
export async function base64ToImage(
  base64: string,
  filename: string = 'image.jpg'
): Promise<string> {
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

/**
 * Calcula o tamanho do arquivo em formato legível
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Obtém o tamanho de um arquivo
 */
export async function getFileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  return info.size || 0;
}

/**
 * Compara dois tamanhos de arquivo
 */
export function getSizeReduction(originalSize: number, newSize: number): {
  original: string;
  new: string;
  reduction: string;
  percentage: number;
} {
  const reduction = originalSize - newSize;
  const percentage = ((reduction / originalSize) * 100);

  return {
    original: formatFileSize(originalSize),
    new: formatFileSize(newSize),
    reduction: formatFileSize(reduction),
    percentage,
  };
}

/**
 * Componente de imagem otimizada
 */
export interface OptimizedImageProps {
  source: { uri: string };
  fallbackSource?: { uri: string };
  placeholderSource?: { uri: string };
  compressionOptions?: CompressionOptions;
  onError?: (error: Error) => void;
  onLoad?: (width: number, height: number) => void;
}

/**
 * Cache de imagens em memória
 */
const imageCache = new Map<string, { uri: string; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

/**
 * Verifica se uma imagem está em cache
 */
export function isImageCached(uri: string): boolean {
  const cached = imageCache.get(uri);
  if (!cached) return false;

  const isExpired = Date.now() - cached.timestamp > CACHE_TTL;

  if (isExpired) {
    imageCache.delete(uri);
    return false;
  }

  return true;
}

/**
 * Adiciona uma imagem ao cache
 */
export function cacheImage(uri: string, compressedUri: string): void {
  imageCache.set(uri, {
    uri: compressedUri,
    timestamp: Date.now(),
  });
}

/**
 * Obtém uma imagem do cache
 */
export function getCachedImage(uri: string): string | null {
  const cached = imageCache.get(uri);
  return cached?.uri || null;
}

/**
 * Limpa o cache de imagens
 */
export function clearImageCache(): void {
  imageCache.clear();
}

/**
 * Comprime uma imagem com cache
 */
export async function compressImageCached(
  uri: string,
  options: CompressionOptions = {}
): Promise<string> {
  // Verifica cache
  const cached = getCachedImage(uri);
  if (cached) {
    // Verifica se o arquivo ainda existe
    const exists = await FileSystem.getInfoAsync(cached);
    if (exists.exists) {
      return cached;
    } else {
      imageCache.delete(uri);
    }
  }

  // Comprime a imagem
  const compressed = await compressImage(uri, options);

  // Adiciona ao cache
  cacheImage(uri, compressed);

  return compressed;
}

/**
 * Processa uma imagem para upload
 */
export async function prepareImageForUpload(
  uri: string,
  useCase: keyof typeof DEFAULT_OPTIONS = 'gallery'
): Promise<{
  uri: string;
  info: ImageInfo;
  compression: {
    original: string;
    new: string;
    reduction: string;
    percentage: number;
  };
}> {
  // Obtém informações originais
  const originalInfo = await getImageInfo(uri);

  // Comprime usando o preset apropriado
  const compressedUri = await compressImage(uri, DEFAULT_OPTIONS[useCase]);

  // Obtém informações comprimidas
  const compressedInfo = await getImageInfo(compressedUri);

  // Calcula a redução
  const compression = getSizeReduction(
    originalInfo.size,
    compressedInfo.size
  );

  console.log('[ImageOptimization] Imagem comprimida:', compression);

  return {
    uri: compressedUri,
    info: compressedInfo,
    compression,
  };
}
