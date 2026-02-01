/**
 * Profile Settings Placeholder Screens
 * These are stub screens that can be expanded later
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';

export default function ProfileSettingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const setting = params.setting as string || 'Configurações';

  const getSettingInfo = (key: string) => {
    const info: Record<string, { title: string; description: string; icon: string }> = {
      availability: {
        title: 'Disponibilidade',
        description: 'Configure seus horários de atendimento',
        icon: 'calendar-clock',
      },
      clinics: {
        title: 'Clínicas',
        description: 'Gerencie as clínicas onde você atende',
        icon: 'building-2',
      },
      notifications: {
        title: 'Notificações',
        description: 'Configure suas preferências de notificação',
        icon: 'bell',
      },
      language: {
        title: 'Idioma',
        description: 'Selecione o idioma do aplicativo',
        icon: 'languages',
      },
      help: {
        title: 'Ajuda e Suporte',
        description: 'Encontre respostas para suas dúvidas',
        icon: 'help-circle',
      },
      feedback: {
        title: 'Enviar Feedback',
        description: 'Ajude-nos a melhorar o FisioFlow',
        icon: 'message-square',
      },
      about: {
        title: 'Sobre o FisioFlow',
        description: 'Informações sobre o aplicativo',
        icon: 'info',
      },
      backup: {
        title: 'Backup de Dados',
        description: 'Faça backup dos seus dados',
        icon: 'download-cloud',
      },
      privacy: {
        title: 'Privacidade e LGPD',
        description: 'Política de privacidade e configurações de dados',
        icon: 'shield',
      },
    };

    return info[key] || { title: key, description: 'Configuração', icon: 'settings' };
  };

  const { title, description, icon } = getSettingInfo(setting);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}10` }]}>
          <Icon name={icon as any} size={48} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
        <Text style={[styles.comingSoon, { color: colors.textSecondary }]}>
          Esta funcionalidade estará disponível em breve.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
  },
  comingSoon: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
});
