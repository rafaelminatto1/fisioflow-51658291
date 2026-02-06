import { useState, useCallback, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type SelectionFor = 'protocol' | 'exercise-plan' | 'appointment';

export default function PatientSelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();

  const forWhat = (params.for as SelectionFor) || 'appointment';
  const protocolId = params.protocolId as string;

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'patients'),
      orderBy('name')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setPatients(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredPatients = patients.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectPatient = useCallback((patient: any) => {
    HapticFeedback.selection();

    if (forWhat === 'protocol' && protocolId) {
      router.push(`/exercise-plans/new?patientId=${patient.id}&protocolId=${protocolId}`);
    } else if (forWhat === 'exercise-plan') {
      router.push(`/exercise-plans/new?patientId=${patient.id}`);
    } else if (forWhat === 'appointment') {
      router.push(`/agenda/new?patientId=${patient.id}`);
    }
  }, [forWhat, protocolId, router]);

  const handleNewPatient = useCallback(() => {
    HapticFeedback.light();
    router.push('/patients/new');
  }, [router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.text }]}>Cancelar</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Selecionar Paciente
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar paciente..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="words"
        />
      </View>

      {/* Patients List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredPatients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {searchQuery ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
          </Text>
          {!searchQuery && (
            <Pressable onPress={handleNewPatient} style={styles.newButton}>
              <Text style={[styles.newButtonText, { color: colors.primary }]}>Novo Paciente</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {filteredPatients.map((patient) => (
            <Pressable
              key={patient.id}
              onPress={() => handleSelectPatient(patient)}
              style={({ pressed }) => [
                styles.patientCard,
                { backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Avatar name={patient.name || ''} size={48} />
              <View style={styles.patientInfo}>
                <Text style={[styles.patientName, { color: colors.text }]}>
                  {patient.name}
                </Text>
                {patient.email && (
                  <Text style={[styles.patientEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                    {patient.email}
                  </Text>
                )}
                {patient.phone && (
                  <Text style={[styles.patientPhone, { color: colors.textSecondary }]}>
                    {patient.phone}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* New Patient FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleNewPatient}
      >
        <Text style={styles.fabText}>+ Novo</Text>
      </Pressable>
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
    padding: 8,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  newButton: {
    padding: 12,
  },
  newButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  patientInfo: {
    flex: 1,
    gap: 2,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  patientEmail: {
    fontSize: 13,
  },
  patientPhone: {
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
