import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { usePatients } from '@/hooks/usePatients';
import { usePatientProtocols } from '@/hooks/usePatientProtocols';
import { Card } from '@/components';

export default function ApplyProtocolScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { medium, success, error: hapticError } = useHaptics();

  const protocolId = params.protocolId as string;
  const preSelectedPatientId = params.patientId as string | undefined;

  const { data: patients, isLoading: isLoadingPatients } = usePatients({ status: 'active' });
  const { apply, isApplying } = usePatientProtocols(preSelectedPatientId || null);

  const [selectedPatientId, setSelectedPatientId] = useState(preSelectedPatientId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');

  const filteredPatients = patients?.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const selectedPatient = patients?.find(p => p.id === selectedPatientId);

  const handleApply = async () => {
    medium();

    if (!selectedPatientId) {
      hapticError();
      Alert.alert('Atenção', 'Selecione um paciente para aplicar o protocolo.');
      return;
    }

    try {
      await apply({ protocolId, notes });

      success();
      Alert.alert(
        'Sucesso',
        `Protocolo aplicado a ${selectedPatient?.name} com sucesso!`,
        [
          {
            text: 'Ver Paciente',
            onPress: () => {
              router.replace(`/patient/${selectedPatientId}?tab=exercises` as any);
            },
          },
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      hapticError();
      Alert.alert('Erro', err.message || 'Não foi possível aplicar o protocolo.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Aplicar Protocolo</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Selected Patient */}
        {selectedPatient && (
          <Card style={styles.selectedCard}>
            <View style={styles.selectedHeader}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text style={[styles.selectedTitle, { color: colors.text }]}>Paciente Selecionado</Text>
            </View>
            <View style={styles.patientInfo}>
              <View style={[styles.patientAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.patientAvatarText}>
                  {selectedPatient.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.patientDetails}>
                <Text style={[styles.patientName, { color: colors.text }]}>
                  {selectedPatient.name}
                </Text>
                {selectedPatient.condition && (
                  <Text style={[styles.patientCondition, { color: colors.textSecondary }]}>
                    {selectedPatient.condition}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  medium();
                  setSelectedPatientId('');
                }}
              >
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Search Patients */}
        {!selectedPatientId && (
          <Card style={styles.searchCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Selecione o Paciente
            </Text>

            <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="search" size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Buscar paciente..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {isLoadingPatients ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : filteredPatients.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {searchQuery ? 'Nenhum paciente encontrado' : 'Nenhum paciente ativo'}
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.patientsList} nestedScrollEnabled>
                {filteredPatients.map((patient) => (
                  <TouchableOpacity
                    key={patient.id}
                    style={[styles.patientItem, { borderColor: colors.border }]}
                    onPress={() => {
                      medium();
                      setSelectedPatientId(patient.id);
                      setSearchQuery('');
                    }}
                  >
                    <View style={[styles.patientAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.patientAvatarText}>
                        {patient.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.patientDetails}>
                      <Text style={[styles.patientName, { color: colors.text }]}>
                        {patient.name}
                      </Text>
                      {patient.condition && (
                        <Text style={[styles.patientCondition, { color: colors.textSecondary }]}>
                          {patient.condition}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Card>
        )}

        {/* Notes */}
        {selectedPatientId && (
          <Card style={styles.notesCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Observações (Opcional)
            </Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Adicione observações sobre a aplicação do protocolo..."
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
          </Card>
        )}

        {/* Apply Button */}
        {selectedPatientId && (
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: colors.primary }]}
            onPress={handleApply}
            disabled={isApplying}
          >
            {isApplying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.applyButtonText}>Aplicar Protocolo</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  selectedCard: {
    padding: 16,
    gap: 12,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchCard: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  patientsList: {
    maxHeight: 300,
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  patientDetails: {
    flex: 1,
    gap: 2,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  patientCondition: {
    fontSize: 13,
  },
  notesCard: {
    padding: 16,
    gap: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
