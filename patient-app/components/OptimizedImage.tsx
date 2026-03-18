/**
 * OptimizedImage Component
 * Image component with caching, lazy loading, and error handling
 */

import { useState } from 'react';
import { Image, ImageStyle, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { getOptimizedImageSource, generateThumbnailUrl, getAvatarFallback } from '@/lib/imageOptimizer';

interface OptimizedImageProps {
  source: string;
  style?: ImageStyle;
  width?: number;
  height?: number;
  borderRadius?: number;
  thumbnail?: boolean;
  fallbackName?: string;
  accessibilityLabel?: string;
}

export function OptimizedImage({
  source,
  style,
  width,
  height,
  borderRadius = 8,
  thumbnail = false,
  fallbackName = '',
  accessibilityLabel = 'Imagem',
}: OptimizedImageProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const imageSource = thumbnail
    ? generateThumbnailUrl(source, width || 100, height || 100)
    : source;

  const optimizedSource = getOptimizedImageSource(imageSource, { width, height });

  if (error && fallbackName) {
    return (
      <View
        style={[
          styles.fallbackContainer,
          {
            width,
            height,
            borderRadius,
            backgroundColor: colors.primary,
          },
          style,
        ]}
      >
        <Image
          source={{ uri: getAvatarFallback(fallbackName, Math.min(width || 100, height || 100)) }}
          style={styles.fallbackImage}
          resizeMode="cover"
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.errorContainer,
          {
            width,
            height,
            borderRadius,
            backgroundColor: colors.surfaceHover,
          },
          style,
        ]}
      >
        <Ionicons name="image-outline" size={32} color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }]}>
      {loading && !thumbnail && (
        <View
          style={[
            styles.loadingPlaceholder,
            {
              width,
              height,
              borderRadius,
              backgroundColor: colors.surfaceHover,
            },
          ]}
        >
          <Ionicons name="image-outline" size={24} color={colors.textMuted} />
        </View>
      )}
      <Image
        source={optimizedSource}
        style={[
          styles.image,
          {
            width,
            height,
            borderRadius,
          },
          loading ? styles.loading : styles.loaded,
          style,
        ]}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        resizeMode="cover"
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    backgroundColor: 'transparent',
  },
  loading: {
    opacity: 0,
  },
  loaded: {
    opacity: 1,
  },
  loadingPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackImage: {
    width: '100%',
    height: '100%',
  },
});
