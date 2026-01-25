/**
 * FisioFlow - Loading States
 *
 * Componentes de loading consistentes para toda a aplicação
 */

import { View, ActivityIndicator } from 'react-native';
import { StyleSheet } from 'react-native';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
}

/**
 * Spinner de carregamento simples
 */
export function LoadingSpinner({ size = 'large', color = '#3B82F6' }: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

interface LoadingScreenProps {
  message?: string;
}

/**
 * Tela de carregamento completa
 */
export function LoadingScreen({ message = 'Carregando...' }: LoadingScreenProps) {
  return (
    <View style={styles.fullScreen}>
      <ActivityIndicator size="large" color="#3B82F6" />
      {message && <LoadingMessage message={message} />}
    </View>
  );
}

interface LoadingMessageProps {
  message: string;
}

/**
 * Mensagem de carregamento
 */
export function LoadingMessage({ message }: LoadingMessageProps) {
  return (
    <View style={styles.messageContainer}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

/**
 * Overlay de carregamento sobreposto ao conteúdo
 */
export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.overlayContent}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        {message && (
          <Text style={styles.overlayMessage}>{message}</Text>
        )}
      </View>
    </View>
  );
}

interface SkeletonProps {
  width?: number | string;
  height?: number;
  style?: any;
}

/**
 * Skeleton para indicar conteúdo carregando
 */
export function Skeleton({ width = '100%', height = 20, style }: SkeletonProps) {
  return (
    <View
      style={[
        styles.skeleton,
        { width, height },
        style
      ]}
    />
  );
}

interface SkeletonCardProps {
  lines?: number;
}

/**
 * Skeleton card para listas
 */
export function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  return (
    <View style={styles.skeletonCard}>
      <Skeleton width={60} height={60} style={styles.skeletonAvatar} />
      <View style={styles.skeletonContent}>
        <Skeleton width="80%" height={16} style={styles.skeletonLine} />
        <Skeleton width="60%" height={14} style={styles.skeletonLine} />
        {lines > 2 && <Skeleton width="40%" height={14} style={styles.skeletonLine} />}
      </View>
    </View>
  );
}

interface LoadingListProps {
  count?: number;
}

/**
 * Lista de skeletons para carregamento de listas
 */
export function LoadingList({ count = 5 }: LoadingListProps) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  messageContainer: {
    marginTop: 16,
  },
  message: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  overlayMessage: {
    marginTop: 16,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  skeleton: {
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skeletonAvatar: {
    borderRadius: 30,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 16,
  },
  skeletonLine: {
    marginBottom: 8,
  },
  list: {
    padding: 16,
  },
});

import { Text } from 'react-native';

export default {
  LoadingSpinner,
  LoadingScreen,
  LoadingMessage,
  LoadingOverlay,
  Skeleton,
  SkeletonCard,
  LoadingList,
};
