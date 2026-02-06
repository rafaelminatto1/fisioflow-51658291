import { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { Card, Button } from '@/components';

// Mock patient data
const mockPatient = {
  id: '1',
  name: 'Maria Silva',
  email: 'maria@email.com',
  phone: '(11) 99999-1111',
  birthDate: '1985-03-15',
  condition: 'Lombalgia cronica',
  startDate: '2025-10-01',
  status: 'active',
  notes: 'Paciente apresenta dor lombar ha 3 meses. Trabalhadora de escritorio com postura inadequada.',
  appointments: [
    { id: '1', date: '2026-01-30', type: 'Fisioterapia', status: 'completed' },
    { id: '2', date: '2026-01-23', type: 'Fisioterapia', status: 'completed' },
    { id: '3', date: '2026-01-16', type: 'Avaliacao', status: 'completed' },
  ],
  exercises: [
    { id: '1', name: 'Alongamento lombar', completed: 15, total: 20 },
    { id: '2', name: 'Fortalecimento core', completed: 10, total: 15 },
    { id: '3', name: 'Postura sentada', completed: 8, total: 10 },
  ],
};

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams();
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'info' | 'history' | 'exercises'>('info');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const patient = mockPatient;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

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
              {patient.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.name, { color: colors.text }]}>{patient.name}</Text>
            <Text style={[styles.condition, { color: colors.textSecondary }]}>
              {patient.condition}
            </Text>
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
          >
            <Ionicons name="calendar" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Agendar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.success }]}
          >
            <Ionicons name="fitness" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Exercicios</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.info }]}
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
              onPress={() => setSelectedTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: selectedTab === tab ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {tab === 'info' ? 'Informacoes' : tab === 'history' ? 'Historico' : 'Exercicios'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {selectedTab === 'info' && (
          <Card style={styles.contentCard}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{patient.email}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Telefone</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{patient.phone}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Nascimento</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(patient.birthDate)}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Ionicons name="flag-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Inicio</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(patient.startDate)}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.notesSection}>
              <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Observacoes</Text>
              <Text style={[styles.notesText, { color: colors.text }]}>{patient.notes}</Text>
            </View>
          </Card>
        )}

        {selectedTab === 'history' && (
          <Card style={styles.contentCard} padding="none">
            {patient.appointments.map((apt, index) => (
              <View
                key={apt.id}
                style={[
                  styles.historyItem,
                  index < patient.appointments.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.historyDot, { backgroundColor: colors.success }]} />
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyType, { color: colors.text }]}>{apt.type}</Text>
                  <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                    {formatDate(apt.date)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            ))}
          </Card>
        )}

        {selectedTab === 'exercises' && (
          <View>
            {patient.exercises.map((exercise) => (
              <Card key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={[styles.exerciseName, { color: colors.text }]}>
                    {exercise.name}
                  </Text>
                  <Text style={[styles.exerciseProgress, { color: colors.primary }]}>
                    {exercise.completed}/{exercise.total}
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${(exercise.completed / exercise.total) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </Card>
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
});
