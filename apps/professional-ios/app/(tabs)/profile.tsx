import { useState, useCallback, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { HapticFeedback } from '@/lib/haptics';
import { getInitials } from '@/lib/utils';
import { useSyncStatus } from '@/lib/offline/offlineHooks';
import { getNotificationManager } from '@/lib/notifications/notificationManager';
import { NotificationBell } from '@/components/NotificationCenter';

type SettingSection = {
  title: string;
  items: SettingItem[];
};

type SettingItem = {
  id: string;
  label: string;
  icon: string;
  iconColor?: string;
  type?: 'button' | 'toggle' | 'chevron';
  route?: string;
  value?: boolean;
  onPress?: () => void;
  destructive?: boolean;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, colorScheme, setColorScheme } = useTheme();
  const { profile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    patients: 0,
    sessions: 0,
    evaluations: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Load professional stats
  useEffect(() => {
    if (!profile?.uid) return;

    const loadStats = async () => {
      try {
        setLoadingStats(true);

        // Count patients
        const patientsQuery = query(
          collection(db, 'patients'),
          where('created_by', '==', profile.uid)
        );
        const patientsSnapshot = await getCountFromServer(patientsQuery);
        const patientsCount = patientsSnapshot.data().count;

        // Count completed sessions (evolutions)
        const sessionsQuery = query(
          collection(db, 'evolutions'),
          where('created_by', '==', profile.uid)
        );
        const sessionsSnapshot = await getCountFromServer(sessionsQuery);
        const sessionsCount = sessionsSnapshot.data().count;

        // Count evaluations
        const evaluationsQuery = query(
          collection(db, 'evaluations'),
          where('created_by', '==', profile.uid)
        );
        const evaluationsSnapshot = await getCountFromServer(evaluationsQuery);
        const evaluationsCount = evaluationsSnapshot.data().count;

        setStats({
          patients: patientsCount,
          sessions: sessionsCount,
          evaluations: evaluationsCount,
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [profile?.uid]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              setSigningOut(true);
              HapticFeedback.medium();
              await signOut(auth);
              // Auth state listener will handle navigation
            } catch (error) {
              HapticFeedback.error();
              Alert.alert('Erro', 'Não foi possível sair da conta. Tente novamente.');
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  }, []);

  // Initialize notifications
  useEffect(() => {
    if (profile?.uid) {
      const manager = getNotificationManager();
      manager.initialize(profile.uid);
    }
  }, [profile?.uid]);

  const syncStatus = useSyncStatus();

  const sections: SettingSection[] = [
    {
      title: 'Conta',
      items: [
        {
          id: 'profile',
          label: 'Meu Perfil',
          icon: 'user',
          iconColor: colors.primary,
          type: 'chevron',
          route: '/profile/edit',
        },
        {
          id: 'availability',
          label: 'Disponibilidade',
          icon: 'calendar-clock',
          iconColor: colors.success,
          type: 'chevron',
          route: '/profile/availability',
        },
        {
          id: 'clinics',
          label: 'Clínicas',
          icon: 'building-2',
          iconColor: colors.notification,
          type: 'chevron',
          route: '/profile/clinics',
        },
      ],
    },
    {
      title: 'Preferências',
      items: [
        {
          id: 'notifications',
          label: 'Notificações',
          icon: 'bell',
          iconColor: '#f59e0b',
          type: 'chevron',
          route: '/profile/notifications',
        },
        {
          id: 'darkMode',
          label: 'Modo Escuro',
          icon: 'moon',
          iconColor: colors.primary,
          type: 'toggle',
          value: colorScheme === 'dark',
          onPress: () => {
            HapticFeedback.selection();
            setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
          },
        },
        {
          id: 'language',
          label: 'Idioma',
          icon: 'languages',
          iconColor: '#ec4899',
          type: 'chevron',
          route: '/profile/language',
        },
      ],
    },
    {
      title: 'Suporte',
      items: [
        {
          id: 'help',
          label: 'Ajuda e Suporte',
          icon: 'help-circle',
          iconColor: '#06b6d4',
          type: 'chevron',
          route: '/profile/help',
        },
        {
          id: 'feedback',
          label: 'Enviar Feedback',
          icon: 'message-square',
          iconColor: '#14b8a6',
          type: 'chevron',
          route: '/profile/feedback',
        },
        {
          id: 'about',
          label: 'Sobre o FisioFlow',
          icon: 'info',
          iconColor: '#6b7280',
          type: 'chevron',
          route: '/profile/about',
        },
      ],
    },
    {
      title: 'Dados',
      items: [
        {
          id: 'backup',
          label: 'Backup de Dados',
          icon: 'download-cloud',
          iconColor: colors.primary,
          type: 'chevron',
          route: '/profile/backup',
        },
        {
          id: 'privacy',
          label: 'Privacidade e LGPD',
          icon: 'shield',
          iconColor: '#22c55e',
          type: 'chevron',
          route: '/profile/privacy',
        },
      ],
    },
    {
      title: 'Outros',
      items: [
        {
          id: 'logout',
          label: 'Sair da Conta',
          icon: 'log-out',
          iconColor: '#ef4444',
          type: 'button',
          destructive: true,
          onPress: handleSignOut,
        },
      ],
    },
  ];

  const handleSettingPress = useCallback((item: SettingItem) => {
    HapticFeedback.light();
    if (item.onPress) {
      item.onPress();
    } else if (item.route) {
      router.push(item.route);
    }
  }, [router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Perfil</Text>
        <NotificationBell />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Pressable
          onPress={() => router.push('/profile/edit')}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
        >
          <Card style={styles.profileCard}>
            <View style={styles.profileContent}>
              <Avatar
                src={profile?.photo_url}
                name={getInitials(profile?.full_name || profile?.email || '')}
                size={80}
              />
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.text }]}>
                  {profile?.full_name || 'Profissional'}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                  {profile?.email}
                </Text>
                {profile?.phone && (
                  <Text style={[styles.profilePhone, { color: colors.textSecondary }]}>
                    {profile.phone}
                  </Text>
                )}
              </View>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </View>
          </Card>
        </Pressable>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Icon name="users" size={24} color={colors.primary} />
            {loadingStats ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.patients}</Text>
            )}
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pacientes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Icon name="calendar-check" size={24} color={colors.success} />
            {loadingStats ? (
              <ActivityIndicator size="small" color={colors.success} />
            ) : (
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.sessions}</Text>
            )}
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sessões</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Icon name="star" size={24} color={colors.warning} />
            {loadingStats ? (
              <ActivityIndicator size="small" color={colors.warning} />
            ) : (
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.evaluations}</Text>
            )}
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avaliações</Text>
          </View>
        </View>

        {/* Sync Status Card */}
        <Card style={[styles.syncCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.syncHeader}>
            <View style={styles.syncHeaderLeft}>
              <Icon
                name={syncStatus.isOnline ? 'wifi' : 'wifi-off'}
                size={20}
                color={syncStatus.isOnline ? colors.success : colors.warning}
              />
              <Text style={[styles.syncTitle, { color: colors.text }]}>Sincronização</Text>
            </View>
            {syncStatus.pendingOperations > 0 && (
              <View style={[styles.syncBadge, { backgroundColor: colors.warning + '20' }]}>
                <Text style={[styles.syncBadgeText, { color: colors.warning }]}>
                  {syncStatus.pendingOperations}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.syncInfo}>
            {syncStatus.isSyncing ? (
              <Text style={[styles.syncStatus, { color: colors.primary }]}>
                Sincronizando...
              </Text>
            ) : syncStatus.pendingOperations > 0 ? (
              <Text style={[styles.syncStatus, { color: colors.warning }]}>
                {syncStatus.pendingOperations} alterações pendentes
              </Text>
            ) : syncStatus.isOnline ? (
              <Text style={[styles.syncStatus, { color: colors.success }]}>
                Tudo sincronizado
              </Text>
            ) : (
              <Text style={[styles.syncStatus, { color: colors.warning }]}>
                Trabalhando offline
              </Text>
            )}
          </View>
        </Card>

        {/* Settings Sections */}
        {sections.map((section, sectionIndex) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {section.title}
            </Text>
            <Card style={styles.sectionCard}>
              {section.items.map((item, itemIndex) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleSettingPress(item)}
                  style={({ pressed }) => [
                    styles.settingItem,
                    {
                      opacity: pressed ? 0.7 : 1,
                      borderBottomColor:
                        itemIndex < section.items.length - 1 ? colors.border : 'transparent',
                    },
                  ]}
                >
                  <View style={styles.settingItemLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: `${item.iconColor}20` }]}>
                      <Icon name={item.icon} size={20} color={item.iconColor} />
                    </View>
                    <Text
                      style={[
                        styles.settingLabel,
                        { color: item.destructive ? colors.error : colors.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>

                  {item.type === 'toggle' ? (
                    <Switch
                      value={item.value}
                      onValueChange={() => handleSettingPress(item)}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  ) : item.type === 'chevron' ? (
                    <Icon name="chevron-right" size={20} color={colors.textSecondary} />
                  ) : null}
                </Pressable>
              ))}
            </Card>
          </View>
        ))}

        {/* Version Info */}
        <View style={styles.versionInfo}>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>
            FisioFlow Profissionais v1.0.0
          </Text>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>
            Feito com ❤️ para fisioterapeutas
          </Text>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 14,
  },
  profilePhone: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  sectionCard: {
    marginHorizontal: 16,
    padding: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  versionText: {
    fontSize: 12,
  },
  bottomSpacing: {
    height: 40,
  },
  syncCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderWidth: 1,
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  syncHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  syncBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  syncInfo: {
    marginTop: 4,
  },
  syncStatus: {
    fontSize: 13,
  },
});
