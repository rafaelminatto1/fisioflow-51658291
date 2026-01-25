import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth, signOut, useNotifications } from '@fisioflow/shared-api';
import {
  Card,
  Button,
  useTheme,
  toast,
  ListItem,
  Switch,
  Divider,
  Avatar,
} from '@fisioflow/shared-ui';

export default function SettingsScreen() {
  const theme = useTheme();
  const { userData } = useAuth();
  const { permission, requestPermission } = useNotifications();

  const [notificationsEnabled, setNotificationsEnabled] = useState(permission === 'granted');
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  async function handleLogout() {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/login');
          } catch (error) {
            console.error('Failed to sign out:', error);
            toast.error('Não foi possível sair. Tente novamente.');
          }
        },
      },
    ]);
  }

  async function handleToggleNotifications(value: boolean) {
    if (value) {
      const status = await requestPermission();
      if (status === 'granted') {
        setNotificationsEnabled(true);
        toast.success('Notificações ativadas!');
      } else {
        toast.error('Ative as notificações nas configurações do dispositivo.');
      }
    } else {
      setNotificationsEnabled(false);
      toast.info('Notificações desativadas');
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.backgroundSecondary }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card */}
      <Card variant="elevated" style={styles.profileCard}>
        <View style={styles.profileContent}>
          <Avatar name={userData?.name || 'Profissional'} size="lg" />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.colors.text.primary }]}>
              {userData?.name || 'Profissional'}
            </Text>
            <Text style={[styles.profileEmail, { color: theme.colors.text.secondary }]}>
              {userData?.email}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: theme.colors.primary[100] }]}
          onPress={() => toast.info('Edição de perfil em breve!')}
        >
          <Ionicons name="pencil" size={16} color={theme.colors.primary[500]} />
          <Text style={[styles.editButtonText, { color: theme.colors.primary[500] }]}>Editar</Text>
        </TouchableOpacity>
      </Card>

      {/* Account Section */}
      <Card variant="elevated" style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>Conta</Text>
        <ListItem
          title="Editar Perfil"
          subtitle="Nome, email, telefone"
          leading={<Ionicons name="person-outline" size={24} color={theme.colors.primary[500]} />}
          trailing={<Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />}
          pressable
          onPress={() => toast.info('Edição de perfil em breve!')}
        />
        <Divider />
        <ListItem
          title="Alterar Senha"
          subtitle="Atualizar sua senha"
          leading={<Ionicons name="lock-closed-outline" size={24} color={theme.colors.warning[500]} />}
          trailing={<Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />}
          pressable
          onPress={() => toast.info('Alteração de senha em breve!')}
        />
      </Card>

      {/* Preferences Section */}
      <Card variant="elevated" style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>Preferências</Text>

        <SwitchListItem
          icon="notifications-outline"
          title="Notificações Push"
          subtitle="Alertas do aplicativo"
          value={notificationsEnabled}
          onValueChange={handleToggleNotifications}
          iconColor={theme.colors.success[500]}
        />
        <Divider />

        <SwitchListItem
          icon="mail-outline"
          title="Notificações por Email"
          subtitle="Resumos diários e semanais"
          value={emailNotificationsEnabled}
          onValueChange={setEmailNotificationsEnabled}
          iconColor={theme.colors.info[500]}
        />
        <Divider />

        <SwitchListItem
          icon="cloud-sync-outline"
          title="Sincronização Automática"
          subtitle="Sincronizar dados automaticamente"
          value={autoSyncEnabled}
          onValueChange={setAutoSyncEnabled}
          iconColor={theme.colors.primary[500]}
        />
      </Card>

      {/* App Settings Section */}
      <Card variant="elevated" style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>Configurações do App</Text>

        <ListItem
          title="Calendário"
          subtitle="Primeiro dia da semana"
          leading={<Ionicons name="calendar-outline" size={24} color={theme.colors.text.tertiary} />}
          trailing={<Text style={[styles.trailingText, { color: theme.colors.text.secondary }]}>Domingo</Text>}
          pressable
          onPress={() => toast.info('Configurações de calendário em breve!')}
        />
        <Divider />

        <ListItem
          title="Backup"
          subtitle="Gerenciar backup dos dados"
          leading={<Ionicons name="cloud-upload-outline" size={24} color={theme.colors.text.tertiary} />}
          trailing={<Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />}
          pressable
          onPress={() => toast.info('Backup em breve!')}
        />
      </Card>

      {/* Support Section */}
      <Card variant="elevated" style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>Suporte</Text>

        <ListItem
          title="Central de Ajuda"
          subtitle="FAQ e tutoriais"
          leading={<Ionicons name="help-circle-outline" size={24} color={theme.colors.info[500]} />}
          trailing={<Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />}
          pressable
          onPress={() => toast.info('Central de ajuda em breve!')}
        />
        <Divider />

        <ListItem
          title="Fale Conosco"
          subtitle="Entre em contato conosco"
          leading={<Ionicons name="chatbubble-ellipses-outline" size={24} color={theme.colors.success[500]} />}
          trailing={<Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />}
          pressable
          onPress={() => toast.info('Fale conosco em breve!')}
        />
        <Divider />

        <ListItem
          title="Termos de Uso"
          leading={<Ionicons name="document-text-outline" size={24} color={theme.colors.text.tertiary} />}
          trailing={<Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />}
          pressable
          onPress={() => toast.info('Termos de uso em breve!')}
        />
        <Divider />

        <ListItem
          title="Política de Privacidade"
          leading={<Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.text.tertiary} />}
          trailing={<Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />}
          pressable
          onPress={() => toast.info('Política de privacidade em breve!')}
        />
      </Card>

      {/* Logout Button */}
      <Button
        variant="danger"
        onPress={handleLogout}
        leftIcon={<Ionicons name="log-out-outline" size={20} color="#fff" />}
        style={styles.logoutButton}
      >
        Sair da Conta
      </Button>

      {/* Version Info */}
      <Text style={[styles.version, { color: theme.colors.text.tertiary }]}>
        FisioFlow Profissionais v1.0.0
      </Text>
      <Text style={[styles.buildInfo, { color: theme.colors.text.disabled }]}>
        Build 1 • Expo SDK 54
      </Text>
    </ScrollView>
  );
}

// SwitchListItem component
function SwitchListItem({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  iconColor: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.switchListItem}>
      <View style={styles.switchListItemLeft}>
        <View style={[styles.menuIcon, { backgroundColor: `${iconColor}20` }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.switchListItemContent}>
          <Text style={[styles.menuItemTitle, { color: theme.colors.text.primary }]}>{title}</Text>
          <Text style={[styles.menuItemDescription, { color: theme.colors.text.secondary }]}>
            {subtitle}
          </Text>
        </View>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileCard: {
    margin: 16,
    padding: 20,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 0,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  trailingText: {
    fontSize: 14,
  },
  switchListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  switchListItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchListItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 12,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  version: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  buildInfo: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 24,
  },
});
