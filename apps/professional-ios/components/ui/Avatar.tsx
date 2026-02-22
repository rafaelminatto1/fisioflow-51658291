import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { getInitials } from '@/lib/utils';
import { usePhotoDecryption } from '@/hooks/usePhotoDecryption';

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  style?: ViewStyle;
  borderColor?: string;
  encrypted?: boolean; // Whether the photo is encrypted (default: true for patient photos)
}

export function Avatar({ src, name, size = 40, style, borderColor, encrypted = true }: AvatarProps) {
  const { colors } = useTheme();
  const { decryptedUri, loading, error } = usePhotoDecryption(encrypted && src ? src : null);

  const initials = getInitials(name || '');

  // Determine which URI to use
  const imageUri = encrypted ? decryptedUri : src;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary,
        },
        borderColor && { borderWidth: 2, borderColor },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : imageUri && !error ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={[
            styles.initials,
            {
              fontSize: size * 0.4,
              color: '#fff',
            },
          ]}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
