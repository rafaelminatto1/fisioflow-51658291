import { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { usePatients } from '@/hooks/usePatients';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useHaptics } from '@/hooks/useHaptics';
import { Card, SyncStatus } from '@/components';

export default function PatientsScreen() {
  const colors = useColors();
  const { data: patients, isLoading, refetch } = usePatients({ status: 'active' });
  const { status: syncStatus, isOnline, setSyncing, setSynced } = useSyncStatus();
  const { light } = useHaptics();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const onRefresh = async () => {
    setRefreshing(true);
    setSyncing();
    light();
    await refetch();
    setSynced();
    setRefreshing(false);
  };

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (patient.condition && patient.condition.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (patient.email && patient.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (!d || isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar paciente..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                light();
                setSearchQuery('');
              }}
            >
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            light();
            router.push('/patient-form');
          }}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Sync Status */}
      <View style={styles.syncStatusContainer}>
        <SyncStatus status={syncStatus} isOnline={isOnline} compact />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statBadge, { backgroundColor: colors.successLight }]}>
          <Text style={[styles.statBadgeText, { color: colors.success }]}>
            {patients.length} Total
          </Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.statBadgeText, { color: colors.primary }]}>
            {filteredPatients.length} Exibindo
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Buscando prontuários...
            </Text>
          </View>
        ) : filteredPatients.length === 0 ? (
          <Card style={styles.emptyCard}>
             <View style={[styles.emptyIconContainer, { backgroundColor: colors.surfaceHighlight || colors.border }]}>
               <Ionicons name={searchQuery ? "search-outline" : "people-outline"} size={32} color={colors.textMuted} />
             </View>
             <Text style={[styles.emptyTitle, { color: colors.text }]}>
               {searchQuery ? 'Sem Resultados' : 'Sem Pacientes'}
             </Text>
             <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
               {searchQuery ? 'Tente buscar com outro termo ou limpe o filtro.' : 'Você ainda não possui pacientes cadastrados. Clique no botão + para adicionar.'}
             </Text>
          </Card>
        ) : (
          <View style={styles.listContainer}>
            {filteredPatients.map((patient) => (
              <TouchableOpacity
                key={patient.id}
                activeOpacity={0.7}
                onPress={() => {
                  light();
                  router.push(`/patient/${patient.id}`);
                }}
              >
                <Card style={styles.patientCard}>
                  <View style={styles.patientHeader}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.avatarText, { color: colors.primary }]}>
                        {patient.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.patientInfo}>
                      <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
                        {patient.name}
                      </Text>
                      {patient.condition ? (
                        <View style={[styles.conditionBadge, { backgroundColor: colors.surfaceHighlight || colors.border }]}>
                          <Text style={[styles.patientCondition, { color: colors.textSecondary }]} numberOfLines={1}>
                            {patient.condition}
                          </Text>
                        </View>
                      ) : (
                        <Text style={[styles.patientConditionText, { color: colors.textMuted }]}>Sem condição</Text>
                      )}
                    </View>
                    <View style={styles.actionArrow}>
                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </View>
                  </View>

                  <View style={[styles.patientFooter, { borderTopColor: colors.border }]}>
                    <View style={styles.footerItem}>
                      <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                        Desde: {formatDate(patient.createdAt)}
                      </Text>
                    </View>
                    {patient.phone && (
                      <View style={styles.footerItem}>
                        <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                          {patient.phone}
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  syncStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 48,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 16,
  },
  listContainer: {
    gap: 12,
  },
  patientCard: {
    borderRadius: 16,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  patientInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 16,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  conditionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  patientCondition: {
    fontSize: 12,
    fontWeight: '500',
  },
  patientConditionText: {
    fontSize: 13,
  },
  actionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  patientFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
