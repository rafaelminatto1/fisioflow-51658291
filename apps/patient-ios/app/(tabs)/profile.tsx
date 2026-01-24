import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { signOut, getFCMToken, requestNotificationPermissions } from '@fisioflow/shared-api';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  async function handleLogout() {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Failed to sign out:', error);
              Alert.alert('Erro', 'Não foi possível sair. Tente novamente.');
            }
          },
        },
      ]
    );
  }

  async function handleToggleNotifications(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (granted) {
        setNotificationsEnabled(true);
        // Get FCM token for push notifications
        const token = await getFCMToken();
        if (token) {
          console.log('FCM token obtained:', token);
          // TODO: Save token to user profile
        }
      } else {
        Alert.alert('Permissões negadas', 'Ative as notificações nas configurações do dispositivo.');
      }
    } else {
      setNotificationsEnabled(false);
    }
  }

  const menuItems = [
    {
      icon: 'person-outline',
      title: 'Editar Perfil',
      description: 'Nome, email, telefone',
      onPress: () => {/* Navigate to edit profile */},
      color: '#3B82F6',
    },
    {
      icon: 'notifications-outline',
      title: 'Notificações',
      description: 'Gerenciar alertas e lembretes',
      rightElement: (
        <Switch
          value={notificationsEnabled}
          onValueChange={handleToggleNotifications}
          trackColor={{ false: '#CBD5E1', true: '#3B82F6' }}
          thumbColor={notificationsEnabled ? '#fff' : '#fff'}
        />
      ),
      onPress: () => {/* Navigate to notifications settings */},
      color: '#10B981',
    },
    {
      icon: 'mail-outline',
      title: 'Lembretes por Email',
      description: 'Resumos e lembretes semanais',
      rightElement: (
        <Switch
          value={emailRemindersEnabled}
          onValueChange={setEmailRemindersEnabled}
          trackColor={{ false: '#CBD5E1', true: '#3B82F6' }}
          thumbColor={emailRemindersEnabled ? '#fff' : '#fff'}
        />
      ),
      onPress: () => {/* Navigate to email settings */},
      color: '#8B5CF6',
    },
    {
      icon: 'lock-closed',
      title: 'Privacidade',
      description: 'Dados pessoais e consentimentos',
      onPress: () => {/* Navigate to privacy settings */},
      color: '#6366F1',
    },
    {
      icon: 'moon-outline',
      title: 'Modo Escuro',
      description: 'Aparência escura',
      rightElement: (
        <Switch
          value={darkModeEnabled}
          onValueChange={setDarkModeEnabled}
          trackColor={{ false: '#CBD5E1', true: '#1E293B' }}
          thumbColor={darkModeEnabled ? '#fff' : '#fff'}
        />
      ),
      onPress: () => {/* Toggle dark mode */},
      color: '#F59E0B',
    },
    {
      icon: 'help-circle-outline',
      title: 'Ajuda e Suporte',
      description: 'FAQ, tutoriais e contato',
      onPress: () => {/* Navigate to help */},
      color: '#64748B',
    },
    {
      icon: 'information-circle-outline',
      title: 'Sobre',
      description: 'Versão e informações',
      onPress: () => {/* Show about modal */},
      color: '#64748B',
    },
  ];

  const quickActions = [
    {
      icon: 'document-text-outline',
      title: 'Termos de Uso',
      onPress: () => {},
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Política de Privacidade',
      onPress: () => {},
    },
    {
      icon: 'alert-circle-outline',
      title: 'Licenças de Software',
      onPress: () => {},
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </Text>
          </View>
          <TouchableOpacity style={styles.editAvatarButton}>
            <Ionicons name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={16} color="#F59E0B" />
            <Text style={styles.statValue}>7</Text>
            <Text style={styles.statLabel}>dias seguidos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="trophy" size={16} color="#8B5CF6" />
            <Text style={styles.statValue}>14</Text>
            <Text style={.statLabel}>melhor</Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações</Text>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemDescription}>{item.description}</Text>
              </View>
            </View>
            {item.rightElement || (
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações</Text>
        {quickActions.map((item, index) => (
          <TouchableOpacity key={index} style={styles.quickActionItem} onPress={item.onPress}>
            <Ionicons name={item.icon as any} size={20} color="#64748B" />
            <Text style={styles.quickActionText}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutButtonText}>Sair da Conta</Text>
      </TouchableOpacity>

      {/* Version Info */}
      <Text style={styles.version}>
        FisioFlow Pacientes v1.0.0
      </Text>
      <Text style={styles.buildInfo}>
        Build 1 • Expo SDK 54
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
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
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemLeft: {
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
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 12,
    color: '#64748B',
  },
  quickActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  quickActionText: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  version: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  buildInfo: {
    fontSize: 10,
    color: '#CBD5E1',
    textAlign: 'center',
  },
});
