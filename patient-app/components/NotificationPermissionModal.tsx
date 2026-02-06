/**
 * Notification Permission Modal
 * Prompts user to enable push notifications
 */

import { useEffect, useState } from 'react';

  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import * as Notifications from 'expo-notifications';

interface NotificationPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onEnable: () => Promise<void>;
}

export function NotificationPermissionModal({
  visible,
  onClose,
  onEnable,
}: NotificationPermissionModalProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    try {
      await onEnable();
      onClose();
    } catch (error) {
      console.error('Error enabling notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={[styles.content, { backgroundColor: colors.surface }]}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="notifications" size={48} color={colors.primary} />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.text }]}>
              Ative as Notificações
            </Text>

            {/* Description */}
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Receba lembretes de exercícios, avisos de consultas e acompanhe seu progresso.
              Nunca perca uma sessão importante!
            </Text>

            {/* Features List */}
            <View style={styles.featuresList}>
              <FeatureItem
                icon="checkmark-circle"
                text="Lembretes de exercícios diários"
                colors={colors}
              />
              <FeatureItem
                icon="calendar"
                text="Avisos de consultas agendadas"
                colors={colors}
              />
              <FeatureItem
                icon="trending-up"
                text="Acompanhamento de progresso"
                colors={colors}
              />
            </View>

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, { borderColor: colors.border }]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={[styles.buttonTextSecondary, { color: colors.textSecondary }]}>
                  Agora não
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary, { backgroundColor: colors.primary }]}
                onPress={handleEnable}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonTextPrimary}>Ativar Notificações</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Privacy Note */}
            <Text style={[styles.privacyNote, { color: colors.textMuted }]}>
              Você pode desativar as notificações a qualquer momento nas configurações.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  colors: any;
}

function FeatureItem({ icon, text, colors }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[styles.featureText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    borderRadius: 24,
    padding: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  featuresList: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  buttons: {
    gap: 12,
    marginBottom: 16,
  },
  button: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    borderWidth: 1,
  },
  buttonPrimary: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  privacyNote: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
