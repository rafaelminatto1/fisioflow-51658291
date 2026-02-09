import { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { Card, Button } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useQuery } from '@tanstack/react-query';
import { getPatientById } from '@/lib/firestore';
import { format } from 'date-fns';
import { usePatientExercises } from '@/hooks';

export default function PatientDetailScreen() {
  const { id, patientName } = useLocalSearchParams();
  const colors = useColors();
  const { light, medium } = useHaptics();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'info' | 'history' | 'exercises'>('info');

  // Alias para exercises quando precisar usar evolution label
  const tabLabel = selectedTab === 'exercises' ? 'Evoluções' : selectedTab === 'info' ? 'Informações' : 'Histórico';

  // Buscar dados reais do paciente
  const { data: patient, isLoading, refetch } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => id ? getPatientById(id as string) : null,
    enabled: !!id,
  });

  // Buscar exercícios do paciente
  const { data: patientExercises } = usePatientExercises(id as string);

  const onRefresh = async () => {
    setRefreshing(true);
    light();
    await refetch();
    setRefreshing(false);
  };

  const name = patient?.name || (patientName as string) || 'Paciente';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Patient Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: colors.successLight },
              ]}
            >
              <Text style={[styles.statusText, { color: colors.success }]}>
                Ativo
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              medium();
              router.push(`/appointment-form?patientId=${id}&patientName=${name}`);
            }}
          >
            <Ionicons name="calendar" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Agendar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.success }]}
            onPress={() => {
              medium();
              router.push(`/exercises?patientId=${id}`);
            }}
          >
            <Ionicons name="fitness" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Exercicios</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.info }]}
            onPress={() => {
              medium();
              router.push(`/patient/[id]/evolution?id=${id}&patientName=${name}`);
            }}
          >
            <Ionicons name="document-text" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Evolucao</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Selector */}
        <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(['info', 'history', 'exercises'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                selectedTab === tab && { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                medium();
                setSelectedTab(tab);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: selectedTab === tab ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {tab === 'info' ? 'Informações' : tab === 'history' ? 'Histórico' : 'Evoluções'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {selectedTab === 'info' && (
          <>
            <Card style={styles.contentCard}>
              <View style={styles.infoSection}>
                <Text style={[styles.infoSectionTitle, { color: colors.text }]}>Informações do Paciente</Text>

                {patient?.email && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email:</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{patient.email}</Text>
                  </View>
                )}
                {patient?.phone && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Telefone:</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{patient.phone}</Text>
                  </View>
                )}
                {patient?.birthDate && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Nascimento:</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {format(new Date(patient.birthDate), 'dd/MM/yyyy')}
                    </Text>
                  </View>
                )}
                {patient?.condition && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
                {patient?.condition && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Condição:</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{patient.condition}</Text>
                  </View>
                )}
                {patient?.diagnosis && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Diagnóstico:</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{patient.diagnosis}</Text>
                  </View>
                )}
                {patient?.notes && (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.notesSection}>
                      <Text style={[styles.notesLabel, { color: colors.text }]}>Observações:</Text>
                      <Text style={[styles.notesText, { color: colors.text }]}>
                        {patient.notes}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </Card>

            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                light();
                router.push(`/patient-form?id=${id}` as any);
              }}
            >
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Editar Perfil</Text>
            </TouchableOpacity>
          </>
        )}

        {selectedTab === 'exercises' && (
          <View style={styles.evolutionsContainer}>
            <TouchableOpacity
              style={[styles.addEvolutionBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                medium();
                router.push(`/patient/[id]/evolution?id=${id}&patientName=${name}`);
              }}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
              <Text style={styles.addEvolutionBtnText}>Nova Evolução SOAP</Text>
            </TouchableOpacity>

            <View style={styles.emptyEvolution}>
              <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyEvolutionTitle, { color: colors.text }]}>
                Nenhuma evolução registrada
              </Text>
              <Text style={[styles.emptyEvolutionText, { color: colors.textSecondary }]}>
                Registre a primeira evolução deste paciente
              </Text>
            </View>
          </View>
        )}

        {selectedTab === 'history' && (
          <View style={styles.evolutionsContainer}>
            <TouchableOpacity
              style={[styles.addEvolutionBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                medium();
                router.push(`/patient/[id]/evolution?id=${id}&patientName=${name}`);
              }}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
              <Text style={styles.addEvolutionBtnText}>Nova Evolução SOAP</Text>
            </TouchableOpacity>

            <View style={styles.emptyEvolution}>
              <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyEvolutionTitle, { color: colors.text }]}>
                Nenhuma evolução registrada
              </Text>
              <Text style={[styles.emptyEvolutionText, { color: colors.textSecondary }]}>
                Registre a primeira evolução deste paciente
              </Text>
            </View>
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
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  condition: {
    fontSize: 14,
    marginVertical: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contentCard: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  notesSection: {
    marginTop: 4,
  },
  notesLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  historyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  historyType: {
    fontSize: 16,
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 13,
  },
  exerciseCard: {
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
  },
  exerciseProgress: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  infoSection: {
    padding: 16,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTabTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyTabText: {
    fontSize: 14,
    marginTop: 4,
  },
  evolutionsContainer: {
    gap: 16,
  },
  addEvolutionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  addEvolutionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyEvolution: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEvolutionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyEvolutionText: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
