/**
 * Loading Overlay Component
 * Full-screen loading overlay with optional message
 */

import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  size?: 'small' | 'large';
}

export function LoadingOverlay({ visible, message, size = 'large' }: LoadingOverlayProps) {
  const colors = useColors();

  if (!visible) {
    return null;
  }

  return (
    <View 
      style={styles.container}
      accessibilityViewIsModal={true}
      accessibilityLabel="Carregando"
    >
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        <ActivityIndicator 
          size={size} 
          color={colors.primary}
          accessibilityLabel="Carregando"
        />
        {message && (
          <Text 
            style={[styles.message, { color: colors.text }]}
            accessibilityLiveRegion="polite"
          >
            {message}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  content: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    minWidth: 150,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
  },
});
