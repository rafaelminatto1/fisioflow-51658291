import { useState, useCallback } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { useHaptics } from '@/hooks/useHaptics';
import { Card, Button, SyncStatus } from '@/components';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/lib/api';
import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { authApi } from '@/lib/auth-api';
import { config } from '@/lib/config';

type MenuItem = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  emBreve?: boolean;
};

export default function ProfileScreen() {
  const colors = useColors();
  const { user, signOut } = useAuthStore();
  const { status: syncStatus, isOnline } = useSyncStatus();
  const { light, medium, success, error } = useHaptics();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['professionalStats'],
    queryFn: () => getDashboardStats('current-professional'),
  });

  const { data: appointments } = useAppointments();
  const { data: patients } = usePatients({ status: 'active' });

  const { data: surveysData } = useQuery({
    queryKey: ['satisfactionSurveysRating'],
    queryFn: async () => {
      const token = await authApi.getToken();
      if (!token) return null;
      const res = await fetch(`${config.apiUrl}/api/satisfaction-surveys?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Returns null when insufficient data — do not show misleading hardcoded value
  const averageRating: number | null = (() => {
    const surveys: any[] = surveysData?.data ?? [];
    if (surveys.length < 5) return null;
    const total = surveys.reduce((sum: number, s: any) => sum + (s.score ?? s.rating ?? 0), 0);
    return Math.round((total / surveys.length) * 10) / 10;
  })();

  const handleLogout = useCallback(() => {
    medium();
    Alert.alert(
      'Sair',
      'Deseja realmente sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => light() },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await signOut();
              success();
              router.replace('/(auth)/login');
            } catch {
              error();
              Alert.alert('Erro', 'Não foi possível sair. Tente novamente.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  }, [medium, light, signOut, success, error]);

  const menuItems: MenuItem[] = [
    {
      icon: 'person-outline',
      label: 'Dados Pessoais',
      onPress: () => { medium(); router.push('/profile-edit' as any); },
    },
    {
      icon: 'business-outline',
      label: 'Dados da Clínica',
      onPress: () => { medium(); router.push('/profile-edit' as any); },
    },
    {
      icon: 'clipboard-outline',
      label: 'Protocolos de Tratamento',
      onPress: () => { medium(); router.push('/protocols' as any); },
    },
    {
      icon: 'time-outline',
      label: 'Horários de Atendimento',
      onPress: () => { light(); Alert.alert('Em breve', 'Funcionalidade em desenvolvimento'); },
      emBreve: true,
    },
    {
      icon: 'notifications-outline',
      label: 'Notificações',
      onPress: () => { light(); Alert.alert('Em breve', 'Funcionalidade em desenvolvimento'); },
      emBreve: true,
    },
    {
      icon: 'lock-closed-outline',
      label: 'Alterar Senha',
      onPress: () => { medium(); router.push('/change-password' as any); },
    },
    {
      icon: 'card-outline',
      label: 'Plano e Faturamento',
      onPress: () => { light(); Alert.alert('Em breve', 'Funcionalidade em desenvolvimento'); },
      emBreve: true,
    },
    {
      icon: 'help-circle-outline',
      label: 'Ajuda e Suporte',
      onPress: () => { light(); Alert.alert('Em breve', 'Funcionalidade em desenvolvimento'); },
      emBreve: true,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => { medium(); router.push('/profile-edit' as any); }}
            activeOpacity={0.8}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0).toUpperCase() || 'P'}
                </Text>
              )}
              <View style={[styles.editAvatarOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={[styles.name, { color: colors.text }]}>
            Dr. {user?.name || 'Profissional'}
          </Text>
          <Text style={[styles.specialty, { color: colors.textSecondary }]}>
            {user?.specialty || 'Fisioterapeuta'}
          </Text>
          {user?.crefito && (
            <View style={[styles.crefitoBadge, { backgroundColor: colors.primaryLight + '20' }]}>
              <Text style={[styles.crefitoText, { color: colors.primary }]}>
                CREFITO: {user.crefito}
              </Text>
            </View>
          )}
          <View style={styles.syncStatusContainer}>
            <SyncStatus status={syncStatus} isOnline={isOnline} />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats?.completedAppointments || appointments.length || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Consultas</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {stats?.activePatients || patients.length || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pacientes</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: averageRating !== null ? colors.warning : colors.textMuted }]}>
              {averageRating !== null ? averageRating : '—'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avaliação</Text>
          </Card>
        </View>

        {/* Menu */}
        <Card style={styles.menuCard} padding="none">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={22} color={colors.textSecondary} />
                <Text style={[styles.menuItemLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
              {item.emBreve ? (
                <View style={[styles.emBreveBadge, { backgroundColor: colors.warning + '22' }]}>
                  <Text style={[styles.emBreveText, { color: colors.warning }]}>Em breve</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          ))}
        </Card>

        <Button
          title="Sair da Conta"
          onPress={handleLogout}
          variant="outline"
          loading={isLoggingOut}
          style={styles.logoutButton}
          textStyle={{ color: colors.error }}
        />

        <Text style={[styles.version, { color: colors.textMuted }]}>
          FisioFlow Pro v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  header: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  editAvatarOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 30,
    borderBottomLeftRadius: 48, borderBottomRightRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#FFFFFF' },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  specialty: { fontSize: 16, marginBottom: 8 },
  crefitoBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  crefitoText: { fontSize: 13, fontWeight: '600' },
  syncStatusContainer: { marginTop: 12 },
  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, alignItems: 'center', padding: 16 },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12 },
  menuCard: { marginBottom: 24 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 16,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuItemLabel: { fontSize: 16 },
  emBreveBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  emBreveText: { fontSize: 10, fontWeight: '700' },
  logoutButton: { marginBottom: 16, borderColor: '#EF4444' },
  version: { textAlign: 'center', fontSize: 12, marginBottom: 24 },
});
