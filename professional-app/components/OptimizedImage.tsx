/**
 * OptimizedImage Component
 *
 * Componente de imagem com cache, loading e fallback otimizados.
 * Usa expo-image para melhor performance e expo-image-manipulator para compressão.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Image as RNImage,
  ImageStyle,
  StyleProp,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Image } from 'expo-image';
import { compressImageCached } from '@/lib/imageOptimization';

interface OptimizedImageProps {
  source: { uri: string };
  style?: StyleProp<ImageStyle>;
  width?: number;
  height?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  /**
   * Preset de compressão: 'avatar' | 'thumbnail' | 'document' | 'medical' | 'gallery'
   */
  compressionPreset?: 'avatar' | 'thumbnail' | 'document' | 'medical' | 'gallery';
  /**
   * Compressão desabilitada (para imagens já otimizadas)
   */
  disableCompression?: boolean;
  /**
   * Placeholder enquanto carrega
   */
  placeholder?: React.ReactNode;
  /**
   * Cor de fundo enquanto carrega
   */
  placeholderColor?: string;
  /**
   * Componente de erro quando falha ao carregar
   */
  errorFallback?: React.ReactNode;
  /**
   * Callback quando a imagem carrega
   */
  onLoad?: () => void;
  /**
   * Callback quando ocorre erro
   */
  onError?: (error: Error) => void;
  /**
   * Mostra indicador de carregamento
   */
  showLoading?: boolean;
  /**
   * Tenta recarregar em caso de erro
   */
  retry?: boolean;
  /**
   * Número de tentativas
   */
  maxRetries?: number;
}

/**
 * Componente de imagem otimizada
 */
export function OptimizedImage({
  source,
  style,
  width = 200,
  height = 200,
  resizeMode = 'cover',
  compressionPreset = 'gallery',
  disableCompression = false,
  placeholder,
  placeholderColor = '#F3F4F6',
  errorFallback,
  onLoad,
  onError,
  showLoading = true,
  retry = true,
  maxRetries = 3,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentUri, setCurrentUri] = useState(source.uri);

  const imageRef = useRef<Image>(null);

  // Processa a imagem
  const processImage = useCallback(async () => {
    if (!source.uri) return;

    setIsLoading(true);
    setHasError(false);

    try {
      // Comprime a imagem se não estiver desabilitado
      const compressedUri = disableCompression
        ? source.uri
        : await compressImageCached(source.uri, { preset: compressionPreset });

      setCurrentUri(compressedUri);
    } catch (error) {
      console.error('[OptimizedImage] Erro ao processar imagem:', error);
      setHasError(true);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [source.uri, disableCompression, compressionPreset, onError]);

  useEffect(() => {
    processImage();
  }, [processImage]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);

    // Tenta recarregar se habilitado e não excedeu tentativas
    if (retry && retryCount < maxRetries) {
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        processImage();
      }, 1000 * (retryCount + 1)); // Exponential backoff
    }

    onError?.(new Error('Falha ao carregar imagem'));
  }, [retry, retryCount, maxRetries, processImage, onError]);

  // Renderiza o estado de erro
  if (hasError) {
    return (
      <View
        style={[
          styles.container,
          { width, height, backgroundColor: placeholderColor },
          style,
        ]}
      >
        {errorFallback || (
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <Text style={styles.errorIconText}>🖼️</Text>
            </View>
            <Text style={styles.errorText}>Erro ao carregar imagem</Text>
            {retry && retryCount < maxRetries && (
              <Text style={styles.retryText}>
                Tentando novamente... ({retryCount + 1}/{maxRetries})
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }

  // Renderiza o estado de carregamento
  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { width, height, backgroundColor: placeholderColor },
          style,
        ]}
      >
        {placeholder || (showLoading && (
          <ActivityIndicator size="small" color="#9CA3AF" />
        ))}
      </View>
    );
  }

  // Renderiza a imagem
  return (
    <Image
      ref={imageRef}
      source={{ uri: currentUri }}
      style={[
        styles.image,
        { width, height },
        style,
      ]}
      contentFit={resizeMode}
      onLoad={handleLoad}
      onError={handleError}
      cachePolicy="memory-disk"
      transition={200}
    />
  );
}

/**
 * Componente de imagem com skeleton
 */
export function ImageWithSkeleton({
  source,
  style,
  width = 200,
  height = 200,
  resizeMode = 'cover',
  skeletonStyle,
  ...props
}: OptimizedImageProps & { skeletonStyle?: any }) {
  const { useColors } = require('@/hooks/useColorScheme');
  const colors = useColors();

  const Skeleton = () => (
    <View
      style={[
        styles.skeleton,
        { backgroundColor: colors.surface },
        { width, height },
        skeletonStyle,
      ]}
    >
      <View
        style={[
          styles.skeletonShimmer,
          { backgroundColor: colors.border },
        ]}
      />
    </View>
  );

  return (
    <OptimizedImage
      {...props}
      source={source}
      style={style}
      width={width}
      height={height}
      resizeMode={resizeMode}
      placeholder={<Skeleton />}
      placeholderColor="transparent"
    />
  );
}

/**
 * Componente de avatar otimizado
 */
export function OptimizedAvatar({
  source,
  size = 64,
  style,
  ...props
}: OptimizedImageProps & {
  size?: number;
}) {
  const avatarStyle = StyleSheet.flatten([
    styles.avatar,
    { width: size, height: size },
    style,
  ]);

  return (
    <OptimizedImage
      {...props}
      source={source}
      style={avatarStyle}
      width={size}
      height={size}
      resizeMode="cover"
      compressionPreset="avatar"
      placeholder={
        <View style={[styles.avatarPlaceholder, { width: size, height: size }]}>
          <Text style={styles.avatarPlaceholderText}>👤</Text>
        </View>
      }
    />
  );
}

/**
 * Componente de galeria otimizado
 */
export function ImageGalleryItem({
  source,
  onPress,
  selected,
  ...props
}: OptimizedImageProps & {
  onPress?: () => void;
  selected?: boolean;
}) {
  const containerStyle = StyleSheet.flatten([
    styles.galleryItem,
    selected && styles.galleryItemSelected,
  ]);

  return (
    <TouchableOpacity onPress={onPress} style={containerStyle}>
      <OptimizedImage
        {...props}
        source={source}
        width={120}
        height={120}
        resizeMode="cover"
        compressionPreset="thumbnail"
      />
      {selected && (
        <View style={styles.selectionIndicator}>
          <Text style={styles.selectionIcon}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    backgroundColor: 'transparent',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorIconText: {
    fontSize: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  skeleton: {
    overflow: 'hidden',
  },
  skeletonShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  avatar: {
    borderRadius: 9999,
  },
  avatarPlaceholder: {
    borderRadius: 9999,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 24,
  },
  galleryItem: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  galleryItemSelected: {
    borderColor: '#3B82F6',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
