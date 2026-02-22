import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { Button } from '@/components/Button';
import { PermissionType } from '@/lib/services/permissionManager';

interface PermissionExplainerModalProps {
  permission: PermissionType;
  visible: boolean;
  onRequest: () => void;
  onCancel: () => void;
}

const PERMISSION_CONFIGS: Record<PermissionType, {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.prototype.props.name;
  benefits: string[];
}> = {
  camera: {
    title: 'Acesso à Câmera',
    description: 'O FisioFlow Pro precisa acessar sua câmera para facilitar seu atendimento clínico.',
    icon: 'camera-outline',
    benefits: [
      'Capturar fotos de progresso dos pacientes',
      'Registrar demonstrações de exercícios',
      'Escaneamento de documentos clínicos'
    ]
  },
  photos: {
    title: 'Galeria de Fotos',
    description: 'O acesso à sua galeria permite gerenciar arquivos importantes do seu histórico clínico.',
    icon: 'images-outline',
    benefits: [
      'Selecionar fotos existentes de pacientes',
      'Anexar laudos e exames médicos',
      'Salvar fotos de evolução na biblioteca'
    ]
  },
  location: {
    title: 'Localização',
    description: 'Sua localização é utilizada para otimizar a gestão da sua agenda e presença clínica.',
    icon: 'location-outline',
    benefits: [
      'Verificar check-in automático na clínica',
      'Confirmar presença em domicílio',
      'Sugerir pacientes próximos para atendimento'
    ]
  },
  notifications: {
    title: 'Notificações Push',
    description: 'Fique sempre atualizado sobre as atividades importantes da sua clínica.',
    icon: 'notifications-outline',
    benefits: [
      'Lembretes de agendamentos próximos',
      'Alertas de novas mensagens de pacientes',
      'Atualizações importantes do sistema'
    ]
  }
};

export function PermissionExplainerModal({
  permission,
  visible,
  onRequest,
  onCancel
}: PermissionExplainerModalProps) {
  const colors = useColors();
  const config = PERMISSION_CONFIGS[permission];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <SafeAreaView>
            <View style={styles.content}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name={config.icon as any} size={48} color={colors.primary} />
              </View>

              <Text style={[styles.title, { color: colors.text }]}>
                {config.title}
              </Text>
              
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {config.description}
              </Text>

              <View style={styles.benefitsContainer}>
                {config.benefits.map((benefit, index) => (
                  <View key={index} style={styles.benefitRow}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={[styles.benefitText, { color: colors.text }]}>
                      {benefit}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.footer}>
                <Button
                  title="Permitir Acesso"
                  onPress={onRequest}
                  style={styles.actionButton}
                />
                <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
                  <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                    Agora não
                  </Text>
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.privacyNote, { color: colors.textMuted }]}>
                Seus dados são criptografados e nunca compartilhados com terceiros para fins de marketing.
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 32,
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 15,
    flex: 1,
  },
  footer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    width: '100%',
  },
  cancelButton: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  privacyNote: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  }
});
