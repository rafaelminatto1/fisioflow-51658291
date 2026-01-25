import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, signOut, useNotifications } from '@fisioflow/shared-api';
import {
  Avatar,
  Button,
  Card,
  useTheme,
  toast,
  ListItem,
  Switch,
  Divider,
  Badge,
} from '@fisioflow/shared-ui';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  onPress?: () => void;
}

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { userData } = useAuth();
  const { permission, requestPermission } = useNotifications();

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    permission === 'granted'
  );
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(true);

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

  function handleToggleEmailReminders(value: boolean) {
    setEmailRemindersEnabled(value);
    toast.info(value ? 'Lembretes por email ativados' : 'Lembretes por email desativados');
  }

  const menuItems: MenuItem[] = [
    {
      icon: 'person-outline',
      title: 'Editar Perfil',
      description: 'Nome, email, telefone',
      color: theme.colors.primary[500],
      onPress: () => {
        toast.info('Edição de perfil em breve!');
      },
    },
    {
      icon: 'notifications-outline',
      title: 'Notificações',
      description: 'Gerenciar alertas e lembretes',
      color: theme.colors.success[500],
      showSwitch: true,
      switchValue: notificationsEnabled,
      onSwitchChange: handleToggleNotifications,
    },
    {
      icon: 'mail-outline',
      title: 'Lembretes por Email',
      description: 'Resumos e lembretes semanais',
      color: theme.colors.info[500],
      showSwitch: true,
      switchValue: emailRemindersEnabled,
      onSwitchChange: handleToggleEmailReminders,
    },
    {
      icon: 'lock-closed-outline',
      title: 'Privacidade',
      description: 'Dados pessoais e consentimentos',
      color: '#6366F1',
      onPress: () => {
        toast.info('Configurações de privacidade em breve!');
      },
    },
    {
      icon: 'moon-outline',
      title: 'Modo Escuro',
      description: 'Aparência escura',
      color: theme.colors.warning[500],
      onPress: () => {
        toast.info('Modo escuro em breve!');
      },
    },
    {
      icon: 'help-circle-outline',
      title: 'Ajuda e Suporte',
      description: 'FAQ, tutoriais e contato',
      color: theme.colors.text.tertiary,
      onPress: () => {
        toast.info('Ajuda em breve!');
      },
    },
    {
      icon: 'information-circle-outline',
      title: 'Sobre',
      description: 'Versão e informações',
      color: theme.colors.text.tertiary,
      onPress: () => {
        Alert.alert('FisioFlow Pacientes', 'Versão 1.0.0\nExpo SDK 54\nBuild 1');
      },
    },
  ];

  const quickActions: QuickAction[] = [
    {
      icon: 'document-text-outline',
      title: 'Termos de Uso',
      onPress: () => {
        toast.info('Termos de Uso em breve!');
      },
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Política de Privacidade',
      onPress: () => {
        toast.info('Política de Privacidade em breve!');
      },
    },
    {
      icon: 'alert-circle-outline',
      title: 'Licenças de Software',
      onPress: () => {
        toast.info('Licenças em breve!');
      },
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.backgroundSecondary }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Card */}
      <Card variant="elevated" style={styles.headerCard}>
        <View style={styles.avatarContainer}>
          <Avatar name={userData?.name || 'Paciente'} size="xl" />
          <TouchableOpacity
            style={[styles.editAvatarButton, { backgroundColor: theme.colors.primary[500] }]}
            onPress={() => toast.info('Alterar foto em breve!')}
          >
            <Ionicons name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.userName, { color: theme.colors.text.primary }]}>
          {userData?.name || 'Paciente'}
        </Text>
        <Text style={[styles.userEmail, { color: theme.colors.text.secondary }]}>
          {userData?.email}
        </Text>

        {/* Quick Stats */}
        <View style={[styles.quickStats, { backgroundColor: theme.colors.backgroundSecondary }]}>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={16} color={theme.colors.warning[500]} />
            <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>7</Text>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>dias</Text>
          </View>
          <Divider orientation="vertical" length={30} />
          <View style={styles.statItem}>
            <Ionicons name="trophy" size={16} color={theme.colors.info[500]} />
            <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>14</Text>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>melhor</Text>
          </View>
        </View>
      </Card>

      {/* Menu Items */}
      <Card variant="elevated" style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
          Configurações
        </Text>
        {menuItems.map((item, index) => (
          <View key={index}>
            {item.showSwitch ? (
              <SwitchListItem
                icon={item.icon}
                title={item.title}
                description={item.description}
                value={item.switchValue || false}
                onValueChange={item.onSwitchChange || (() => { })}
                iconColor={item.color}
              />
            ) : (
              <ListItem
                title={item.title}
                subtitle={item.description}
                leading={
                  <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                }
                trailing={<Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />}
                pressable
                onPress={item.onPress}
              />
            )}
            {index < menuItems.length - 1 && <Divider />}
          </View>
        ))}
      </Card>

      {/* Quick Actions */}
      <Card variant="elevated" style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
          Informações
        </Text>
        {quickActions.map((item, index) => (
          <View key={index}>
            <ListItem
              title={item.title}
              leading={<Ionicons name={item.icon} size={20} color={theme.colors.text.tertiary} />}
              trailing={<Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />}
              pressable
              onPress={item.onPress}
            />
            {index < quickActions.length - 1 && <Divider />}
          </View>
        ))}
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
        FisioFlow Pacientes v1.0.0
      </Text>
      <Text style={[styles.buildInfo, { color: theme.colors.text.tertiary }]}>
        Build 1 • Expo SDK 54
      </Text>
    </ScrollView>
  );
}

// SwitchListItem component
function SwitchListItem({
  icon,
  title,
  description,
  value,
  onValueChange,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
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
            {description}
          </Text>
        </View>
      </View>
      <Switch value={value} onChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    margin: 16,
    padding: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  quickStats: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
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
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
