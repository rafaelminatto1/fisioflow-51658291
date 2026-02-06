import { useState, useCallback, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Appointment } from '@/types';

export default function EvaluateSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();

  const appointmentId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);

  // Evaluation fields
  const [patientResponse, setPatientResponse] = useState('');
  const [painLevel, setPainLevel] = useState<number>(0);
  const [functionalImprovement, setFunctionalImprovement] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [homeExercisePrescribed, setHomeExercisePrescribed] = useState(false);

  const loadAppointment = useCallback(async () => {
    try {
      const docRef = doc(db, 'appointments', appointmentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setAppointment({ id: docSnap.id, ...docSnap.data() } as Appointment);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading appointment:', error);
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  const handleSaveEvaluation = useCallback(async () => {
    try {
      setSaving(true);
      HapticFeedback.heavy();

      await updateDoc(doc(db, 'appointments', appointmentId), {
        status: 'concluido',
        evaluation: {
          patient_response: patientResponse,
          pain_level: painLevel,
          functional_improvement: functionalImprovement,
          notes,
          home_exercise_prescribed: homeExercisePrescribed,
        },
        completed_at: serverTimestamp(),
      });

      HapticFeedback.success();
      Alert.alert(
        'Avaliação Registrada',
        'A avaliação foi registrada com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving evaluation:', error);
      HapticFeedback.error();
      Alert.alert('Erro', 'Não foi possível salvar a avaliação.');
    } finally {
      setSaving(false);
    }
  }, [
    appointmentId,
    patientResponse,
    painLevel,
    functionalImprovement,
    exercisesPerformed,
    notes,
    homeExercisePrescribed,
    router,
  ]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Icon name="alert-triangle" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Agendamento não encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const aptDate = new Date(appointment.date as string);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Avaliar Sessão</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Patient Header */}
        <Card style={styles.patientCard}>
          <View style={styles.patientHeader}>
            <Avatar name={appointment.patientName || ''} size={48} />
            <View style={styles.patientInfo}>
              <Text style={[styles.patientName, { color: colors.text }]}>
                {appointment.patientName}
              </Text>
              <Text style={[styles.appointmentType, { color: colors.textSecondary }]}>
                {appointment.type}
              </Text>
              <Text style={[styles.appointmentDate, { color: colors.textSecondary }]}>
                {format(aptDate, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </Text>
            </View>
          </View>
        </Card>

        {/* Patient Response */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="message-square" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Resposta do Paciente</Text>
          </View>
          <Card style={styles.card}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Como o paciente respondeu ao tratamento?
            </Text>
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
              placeholder="Descreva a resposta do paciente..."
              placeholderTextColor={colors.textSecondary}
              value={patientResponse}
              onChangeText={setPatientResponse}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Card>
        </View>

        {/* Pain Level */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="thermometer" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Nível de Dor</Text>
          </View>
          <Card style={styles.card}>
            <View style={styles.painContainer}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <Pressable
                  key={level}
                  onPress={() => setPainLevel(level)}
                  style={({ pressed }) => [
                    styles.painButton,
                    {
                      backgroundColor: painLevel === level
                        ? level <= 3 ? '#22c55e' : level <= 6 ? '#f59e0b' : '#ef4444'
                        : colors.card,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.painButtonText,
                      { color: painLevel === level ? '#fff' : colors.text },
                    ]}
                  >
                    {level}
                  </Text>
                </Pressable>
              ))}
            </View>
            {painLevel > 0 && (
              <Text style={[styles.painLabel, { color: colors.textSecondary }]}>
                Dor: {painLevel <= 3 ? 'Leve' : painLevel <= 6 ? 'Moderada' : 'Intensa'}
              </Text>
            )}
          </Card>
        </View>

        {/* Functional Improvement */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="trending-up" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Melhora Funcional</Text>
          </View>
          <Card style={styles.card}>
            <View style={styles.improvementSlider}>
              <Text style={[styles.improvementValue, { color: colors.text }]}>
                {functionalImprovement}%
              </Text>
              <View style={[styles.improvementBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.improvementFill,
                    {
                      width: `${functionalImprovement}%`,
                      backgroundColor: functionalImprovement >= 70 ? colors.success :
                                   functionalImprovement >= 40 ? colors.warning : colors.error,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.improvementButtons}>
              {[0, 25, 50, 75, 100].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setFunctionalImprovement(value)}
                  style={({ pressed }) => [
                    styles.improvementButton,
                    {
                      backgroundColor: functionalImprovement === value ? colors.primary : colors.card,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.improvementButtonText,
                      { color: functionalImprovement === value ? '#fff' : colors.text },
                    ]}
                  >
                    {value}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </View>

        {/* Home Exercise */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="home" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Exercícios em Casa</Text>
          </View>
          <Card style={styles.card}>
            <Pressable
              onPress={() => setHomeExercisePrescribed(!homeExercisePrescribed)}
              style={[styles.toggleRow, { backgroundColor: colors.card }]}
            >
              <View style={styles.toggleInfo}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>
                  Prescrever exercícios domiciliares
                </Text>
                <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                  Marque se foram prescritos exercícios para fazer em casa
                </Text>
              </View>
              <View style={[styles.toggleSwitch, {
                backgroundColor: homeExercisePrescribed ? colors.primary : colors.border
              }]}>
                <View style={[styles.toggleKnob, {
                  transform: [{ translateX: homeExercisePrescribed ? 20 : 0 }]
                }]} />
              </View>
            </Pressable>
          </Card>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="clipboard" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Observações</Text>
          </View>
          <Card style={styles.card}>
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
              placeholder="Adicione observações adicionais..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Card>
        </View>

        {/* Save Button */}
        <Button
          variant="primary"
          size="lg"
          onPress={handleSaveEvaluation}
          loading={saving}
          style={styles.saveButton}
        >
          Salvar Avaliação
        </Button>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  patientCard: {
    padding: 16,
    marginBottom: 20,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientInfo: {
    flex: 1,
    gap: 2,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
  },
  appointmentType: {
    fontSize: 14,
  },
  appointmentDate: {
    fontSize: 13,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
  },
  painContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  painButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  painButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  painLabel: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  improvementSlider: {
    alignItems: 'center',
    marginBottom: 16,
  },
  improvementValue: {
    fontSize: 36,
    fontWeight: '800',
  },
  improvementBar: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 8,
  },
  improvementFill: {
    height: '100%',
    borderRadius: 6,
  },
  improvementButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  improvementButton: {
    width: 60,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  improvementButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  toggleDescription: {
    fontSize: 13,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  saveButton: {
    marginTop: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});
