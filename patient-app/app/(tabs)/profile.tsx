import { useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { Card, Button } from '@/components';
import { usePatientNotifications } from '@/lib/notificationsSystem';
import { collection, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { APP_VERSION } from '@/lib/constants';
import * as Notifications from 'expo-notifications';

interface UserStats {
  totalAppointments: number;
  totalExercises: number;
  totalMonths: number;
}

export default function ProfileScreen() {
  const colors = useColors();
  const { user, signOut } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [stats, setStats] = useState<UserStats>({
    totalAppointments: 0,
    totalExercises: 0,
    totalMonths: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Check notification permission status on mount
  useEffect(() => {
    checkNotificationStatus();
    fetchUserStats();
  }, [user?.id]);

  const checkNotificationStatus = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
    } catch (error) {
      console.error('Error checking notification status:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const fetchUserStats = async () => {
    if (!user?.id) {
      setLoadingStats(false);
      return;
    }

    try {
      // Count completed appointments
      const appointmentsRef = collection(db, 'users', user.id, 'appointments');
      const appointmentsSnapshot = await getCountFromServer(appointmentsRef);
      const totalAppointments = appointmentsSnapshot.data().count;

      // Count exercises from all plans
      const plansRef = collection(db, 'users', user.id, 'exercise_plans');
      const plansSnapshot = await getDocs(plansRef);
      let totalExercises = 0;
      plansSnapshot.forEach((doc) => {
        const plan = doc.data();
        const exercises = plan.exercises || [];
        const completed = exercises.filter((e: any) => e.completed).length;
        totalExercises += completed;
      });

      // Calculate months since account creation
      const createdAt = user.createdAt || new Date();
      const now = new Date();
      const monthsDiff = Math.max(
        1,
        Math.floor((now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
      );

      setStats({
        totalAppointments,
        totalExercises,
        totalMonths: monthsDiff,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const { permission, loading, requestPermission } = usePatientNotifications();

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Erro', 'Nao foi possivel sair. Tente novamente.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestPermission();
      if (granted) {
        setNotificationsEnabled(true);
        Alert.alert(
          'Notificações Ativadas',
          'Você receberá lembretes de exercícios e consultas.'
        );
      } else {
        Alert.alert(
          'Permissão Necessária',
          'Para receber notificações, você precisa permitir o acesso nas configurações do dispositivo.'
        );
      }
    } else {
      setNotificationsEnabled(false);
      Alert.alert(
        'Notificações Desativadas',
        'Você não receberá mais lembretes.'
      );
    }
  };

  const menuItems = [
    {
      icon: 'settings-outline' as const,
      label: 'Configurações Completas',
      onPress: () => router.push('/(tabs)/settings'),
      color: colors.primary,
    },
    {
      icon: 'person-outline' as const,
      label: 'Dados Pessoais',
      onPress: () => router.push('/(tabs)/settings'),
      color: colors.text,
    },
    {
      icon: 'lock-closed-outline' as const,
      label: 'Alterar Senha',
      onPress: () => {
        router.replace('/(auth)/forgot-password');
      },
      color: colors.text,
    },
    {
      icon: 'help-circle-outline' as const,
      label: 'Ajuda e Suporte',
      onPress: () => router.push('/(tabs)/settings'),
      color: colors.text,
    },
    {
      icon: 'document-text-outline' as const,
      label: 'Termos de Uso',
      onPress: () => router.push('/(tabs)/settings'),
      color: colors.text,
    },
    {
      icon: 'shield-outline' as const,
      label: 'Política de Privacidade',
      onPress: () => router.push('/(tabs)/settings'),
      color: colors.text,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'P'}
              </Text>
            )}
          </View>
          <Text style={[styles.name, { color: colors.text }]}>
            {user?.name || 'Paciente'}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>
            {user?.email || 'email@exemplo.com'}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            {loadingStats ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stats.totalAppointments}
              </Text>
            )}
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Consultas
            </Text>
          </Card>
          <Card style={styles.statCard}>
            {loadingStats ? (
              <ActivityIndicator size="small" color={colors.success} />
            ) : (
              <Text style={[styles.statValue, { color: colors.success }]}>
                {stats.totalExercises}
              </Text>
            )}
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Exercícios
            </Text>
          </Card>
          <Card style={styles.statCard}>
            {loadingStats ? (
              <ActivityIndicator size="small" color={colors.warning} />
            ) : (
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {stats.totalMonths}
              </Text>
            )}
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Meses
            </Text>
          </Card>
        </View>

        {/* Notification Settings Card */}
        <Card style={styles.settingsCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Configurações
          </Text>

          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingItemLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="notifications" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Notificações Push
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Lembretes de exercícios e consultas
                </Text>
              </View>
            </View>
            {loadingNotifications ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                thumbColor={notificationsEnabled ? colors.primary : colors.textMuted}
              />
            )}
          </View>
        </Card>

        {/* Menu */}
        <Card style={styles.menuCard} padding="none">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={(item as any).color || colors.textSecondary}
                />
                <Text style={[styles.menuItemLabel, { color: colors.text }]}>
                  {item.label}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Logout Button */}
        <Button
          title="Sair da Conta"
          onPress={handleLogout}
          variant="outline"
          loading={isLoggingOut}
          style={styles.logoutButton}
          textStyle={{ color: colors.error }}
        />

        {/* Version */}
        <Text style={[styles.version, { color: colors.textMuted }]}>
          FisioFlow v{APP_VERSION}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
  },
  settingsCard: {
    marginBottom: 24,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  menuCard: {
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 16,
  },
  logoutButton: {
    marginBottom: 16,
    borderColor: '#EF4444',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 24,
  },
});
