import { useState, useCallback, useEffect } from 'react';

  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
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
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Evaluation } from '@/types';

export default function EvaluationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();

  const evaluationId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  useEffect(() => {
    loadEvaluation();
  }, [evaluationId]);

  const loadEvaluation = async () => {
    try {
      const docRef = doc(db, 'evaluations', evaluationId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setEvaluation({ id: docSnap.id, ...docSnap.data() } as Evaluation);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading evaluation:', error);
      setLoading(false);
    }
  };

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Excluir Avaliação',
      'Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'evaluations', evaluationId));
              HapticFeedback.success();
              router.back();
            } catch (error) {
              HapticFeedback.error();
              Alert.alert('Erro', 'Não foi possível excluir a avaliação.');
            }
          },
        },
      ]
    );
  }, [evaluationId, router]);

  const handleEdit = useCallback(() => {
    HapticFeedback.light();
    router.push(`/evaluations/${evaluationId}/edit`);
  }, [evaluationId, router]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!evaluation) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Icon name="alert-triangle" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Avaliação não encontrada</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Avaliação</Text>
        <Pressable onPress={handleEdit} style={styles.headerButton}>
          <Icon name="edit-2" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Evaluation Header */}
        <Card style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <View style={styles.sessionInfo}>
              <Text style={[styles.sessionTitle, { color: colors.text }]}>
                {evaluation.chiefComplaint || 'Avaliação Inicial'}
              </Text>
              <Text style={[styles.sessionDate, { color: colors.textSecondary }]}>
                {format(new Date(evaluation.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </Text>
            </View>
          </View>
        </Card>

        {/* Chief Complaint */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="alert-circle" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Queixa Principal</Text>
          </View>
          <Card style={styles.card}>
            <Text style={[styles.content, { color: colors.text }]}>
              {evaluation.chiefComplaint || 'Nenhuma informação registrada'}
            </Text>
          </Card>
        </View>

        {/* History of Present Illness */}
        {evaluation.historyOfPresentIllness && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="history" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>História da Doença Atual</Text>
            </View>
            <Card style={styles.card}>
              <Text style={[styles.content, { color: colors.text }]}>
                {evaluation.historyOfPresentIllness}
              </Text>
            </Card>
          </View>
        )}

        {/* Past Medical History */}
        {evaluation.pastMedicalHistory && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="file-text" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Histórico Médico</Text>
            </View>
            <Card style={styles.card}>
              <Text style={[styles.content, { color: colors.text }]}>
                {evaluation.pastMedicalHistory}
              </Text>
            </Card>
          </View>
        )}

        {/* Medications */}
        {evaluation.medications && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="pill" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Medicações</Text>
            </View>
            <Card style={styles.card}>
              <Text style={[styles.content, { color: colors.text }]}>
                {evaluation.medications}
              </Text>
            </Card>
          </View>
        )}

        {/* Vital Signs */}
        {evaluation.vitalSigns && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="activity" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Sinais Vitais</Text>
            </View>
            <Card style={styles.card}>
              <View style={styles.vitalSignsGrid}>
                {evaluation.vitalSigns.blood_pressure && (
                  <View style={styles.vitalSignItem}>
                    <Text style={[styles.vitalSignLabel, { color: colors.textSecondary }]}>Pressão Arterial</Text>
                    <Text style={[styles.vitalSignValue, { color: colors.text }]}>
                      {evaluation.vitalSigns.blood_pressure} mmHg
                    </Text>
                  </View>
                )}
                {evaluation.vitalSigns.heart_rate && (
                  <View style={styles.vitalSignItem}>
                    <Text style={[styles.vitalSignLabel, { color: colors.textSecondary }]}>Frequência Cardíaca</Text>
                    <Text style={[styles.vitalSignValue, { color: colors.text }]}>
                      {evaluation.vitalSigns.heart_rate} bpm
                    </Text>
                  </View>
                )}
                {evaluation.vitalSigns.temperature && (
                  <View style={styles.vitalSignItem}>
                    <Text style={[styles.vitalSignLabel, { color: colors.textSecondary }]}>Temperatura</Text>
                    <Text style={[styles.vitalSignValue, { color: colors.text }]}>
                      {evaluation.vitalSigns.temperature} °C
                    </Text>
                  </View>
                )}
                {evaluation.vitalSigns.respiratory_rate && (
                  <View style={styles.vitalSignItem}>
                    <Text style={[styles.vitalSignLabel, { color: colors.textSecondary }]}>Frequência Respiratória</Text>
                    <Text style={[styles.vitalSignValue, { color: colors.text }]}>
                      {evaluation.vitalSigns.respiratory_rate} rpm
                    </Text>
                  </View>
                )}
                {evaluation.vitalSigns.oxygen_saturation && (
                  <View style={styles.vitalSignItem}>
                    <Text style={[styles.vitalSignLabel, { color: colors.textSecondary }]}>Saturação O2</Text>
                    <Text style={[styles.vitalSignValue, { color: colors.text }]}>
                      {evaluation.vitalSigns.oxygen_saturation}%
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          </View>
        )}

        {/* Examination */}
        {evaluation.examination && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="search" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Exame Físico</Text>
            </View>
            <Card style={styles.card}>
              {evaluation.examination.inspection && (
                <View style={styles.objectiveItem}>
                  <Text style={[styles.objectiveLabel, { color: colors.textSecondary }]}>Inspeção:</Text>
                  <Text style={[styles.content, { color: colors.text }]}>
                    {evaluation.examination.inspection}
                  </Text>
                </View>
              )}
              {evaluation.examination.palpation && (
                <View style={styles.objectiveItem}>
                  <Text style={[styles.objectiveLabel, { color: colors.textSecondary }]}>Palpação:</Text>
                  <Text style={[styles.content, { color: colors.text }]}>
                    {evaluation.examination.palpation}
                  </Text>
                </View>
              )}
              {evaluation.examination.range_of_motion && Object.keys(evaluation.examination.range_of_motion).length > 0 && (
                <View style={styles.objectiveItem}>
                  <Text style={[styles.objectiveLabel, { color: colors.textSecondary }]}>Amplitude de Movimento:</Text>
                  {Object.entries(evaluation.examination.range_of_motion).map(([key, value]) => (
                    <Text key={key} style={[styles.content, { color: colors.text }]}>
                      {key}: {value}
                    </Text>
                  ))}
                </View>
              )}
              {evaluation.examination.muscle_strength && Object.keys(evaluation.examination.muscle_strength).length > 0 && (
                <View style={styles.objectiveItem}>
                  <Text style={[styles.objectiveLabel, { color: colors.textSecondary }]}>Força Muscular:</Text>
                  {Object.entries(evaluation.examination.muscle_strength).map(([key, value]) => (
                    <Text key={key} style={[styles.content, { color: colors.text }]}>
                      {key}: {value}
                    </Text>
                  ))}
                </View>
              )}
              {evaluation.examination.special_tests && Object.keys(evaluation.examination.special_tests).length > 0 && (
                <View style={styles.objectiveItem}>
                  <Text style={[styles.objectiveLabel, { color: colors.textSecondary }]}>Testes Especiais:</Text>
                  {Object.entries(evaluation.examination.special_tests).map(([key, value]) => (
                    <Text key={key} style={[styles.content, { color: colors.text }]}>
                      {key}: {value ? 'Positivo' : 'Negativo'}
                    </Text>
                  ))}
                </View>
              )}
            </Card>
          </View>
        )}

        {/* Diagnosis */}
        {evaluation.diagnosis && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="stethoscope" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Diagnóstico</Text>
            </View>
            <Card style={styles.card}>
              <Text style={[styles.content, { color: colors.text }]}>
                {evaluation.diagnosis}
              </Text>
            </Card>
          </View>
        )}

        {/* Prognosis */}
        {evaluation.prognosis && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="trending-up" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Prognóstico</Text>
            </View>
            <Card style={styles.card}>
              <Text style={[styles.content, { color: colors.text }]}>
                {evaluation.prognosis}
              </Text>
            </Card>
          </View>
        )}

        {/* Treatment Plan */}
        {evaluation.treatmentPlan && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="clipboard-list" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Plano de Tratamento</Text>
            </View>
            <Card style={styles.card}>
              <Text style={[styles.content, { color: colors.text }]}>
                {evaluation.treatmentPlan}
              </Text>
            </Card>
          </View>
        )}

        {/* Recommendations */}
        {evaluation.recommendations && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="check-circle" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recomendações</Text>
            </View>
            <Card style={styles.card}>
              <Text style={[styles.content, { color: colors.text }]}>
                {evaluation.recommendations}
              </Text>
            </Card>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            variant="outline"
            onPress={handleDelete}
            style={[styles.actionButton, { borderColor: colors.error }]}
          >
            <Icon name="trash-2" size={18} color={colors.error} />
          </Button>
          <Button
            variant="primary"
            onPress={handleEdit}
            style={styles.actionButton}
          >
            <Icon name="edit-2" size={18} color="#fff" />
            {' '}Editar
          </Button>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sessionCard: {
    marginBottom: 24,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
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
  content: {
    fontSize: 15,
    lineHeight: 22,
  },
  objectiveItem: {
    marginBottom: 12,
  },
  objectiveLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  vitalSignsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  vitalSignItem: {
    width: '45%',
  },
  vitalSignLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  vitalSignValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  bottomSpacing: {
    height: 40,
  },
});
