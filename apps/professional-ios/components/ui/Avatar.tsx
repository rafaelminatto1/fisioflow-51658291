import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { getInitials } from '@/lib/utils';

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  style?: ViewStyle;
  borderColor?: string;
}

export function Avatar({ src, name, size = 40, style, borderColor }: AvatarProps) {
  const { colors } = useTheme();

  const initials = getInitials(name || '');

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
      {src ? (
        <Image
          source={{ uri: src }}
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
