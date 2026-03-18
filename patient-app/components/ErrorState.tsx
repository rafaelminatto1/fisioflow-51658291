/**
 * ErrorState Component
 * Beautiful error state with retry functionality
 */

import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function ErrorState({
  title = 'Ocorreu um erro',
  message = 'Não foi possível carregar as informações. Tente novamente.',
  onRetry,
  retryText = 'Tentar novamente',
  icon = 'warning-outline',
}: ErrorStateProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.error + '15' }]}>
        <Ionicons name={icon} size={48} color={colors.error} />
      </View>
      
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {message}
      </Text>

      {onRetry && (
        <Button
          title={retryText}
          onPress={onRetry}
          style={styles.retryButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    minWidth: 180,
  },
});
