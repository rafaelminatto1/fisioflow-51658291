import { useState, useCallback, useEffect, useRef } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { VitalSignsInput } from '@/components/VitalSignsInput';
import { ObjectiveExamForm } from '@/components/ObjectiveExamForm';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { HapticFeedback } from '@/lib/haptics';
import { useEvolutions } from '@/hooks/useEvolutions';
import type { SOAPRecord } from '@/types';

export default function EditEvolutionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const { profile } = useAuth();

  const evolutionId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evolution, setEvolution] = useState<SOAPRecord | null>(null);
  
  // Use the hook to get decrypted SOAP data and update method
  const { getById, update } = useEvolutions();

  // SOAP fields
  const [subjective, setSubjective] = useState('');
  const [assessment, setAssessment] = useState('');

  // Objective fields
  const [inspection, setInspection] = useState('');
  const [palpation, setPalpation] = useState('');
  const [postureAnalysis, setPostureAnalysis] = useState('');
  const [movementTests, setMovementTests] = useState<Record<string, string>>({});
  const [specialTests, setSpecialTests] = useState<Record<string, boolean>>({});

  // Plan fields
  const [shortTermGoals, setShortTermGoals] = useState<string[]>([]);
  const [longTermGoals, setLongTermGoals] = useState<string[]>([]);
  const [interventions, setInterventions] = useState<string[]>([]);
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');

  // Vital signs
  const [bloodPressure, setBloodPressure] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [oxygenSaturation, setOxygenSaturation] = useState('');

  // Signature (read-only for edit)
  const signatureRef = useRef<any>(null);
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => {
    loadEvolution();
  }, [evolutionId]);

  const loadEvolution = async () => {
    try {
      setLoading(true);
      // Use the hook's getById method which decrypts PHI fields
      const evo = await getById(evolutionId);

      if (evo) {
        setEvolution(evo);

        // Load form fields with decrypted data
        setSubjective(evo.subjective || '');
        setAssessment(evo.assessment || '');
        setInspection(evo.objective?.inspection || '');
        setPalpation(evo.objective?.palpation || '');
        setPostureAnalysis(evo.objective?.posture_analysis || '');
        setMovementTests(evo.objective?.movement_tests || {});
        setSpecialTests(evo.objective?.special_tests || {});
        setShortTermGoals(evo.plan?.short_term_goals || []);
        setLongTermGoals(evo.plan?.long_term_goals || []);
        setInterventions(evo.plan?.interventions || []);
        setFrequency(evo.plan?.frequency || '');
        setDuration(evo.plan?.duration || '');
        setBloodPressure(evo.vitalSigns?.blood_pressure || '');
        setHeartRate(evo.vitalSigns?.heart_rate?.toString() || '');
        setTemperature(evo.vitalSigns?.temperature?.toString() || '');
        setRespiratoryRate(evo.vitalSigns?.respiratory_rate?.toString() || '');
        setOxygenSaturation(evo.vitalSigns?.oxygen_saturation?.toString() || '');
        setSignature(evo.signatureHash || null);
      }
      setLoading(false);
    } catch (error) {
      // Never log PHI content - only log error type
      console.error('Error loading evolution - failed to decrypt');
      Alert.alert('Erro', 'Não foi possível carregar a evolução.');
      setLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!subjective.trim()) {
      Alert.alert('Campo obrigatório', 'Preencha o campo Subjetivo (queixa do paciente).');
      return;
    }

    if (!assessment.trim()) {
      Alert.alert('Campo obrigatório', 'Preencha o campo Avaliação.');
      return;
    }

    try {
      setSaving(true);
      HapticFeedback.medium();

      // Use the hook's update method which encrypts PHI fields
      await update(evolutionId, {
        subjective,
        objective: {
          inspection,
          palpation,
          movement_tests: movementTests,
          special_tests,
          posture_analysis: postureAnalysis,
        },
        assessment,
        plan: {
          short_term_goals: shortTermGoals,
          long_term_goals: longTermGoals,
          interventions,
          frequency,
          duration,
          home_exercises: [],
        },
        vitalSigns: {
          blood_pressure: bloodPressure,
          heart_rate: heartRate ? parseInt(heartRate) : null,
          temperature: temperature ? parseFloat(temperature) : null,
          respiratory_rate: respiratoryRate ? parseInt(respiratoryRate) : null,
          oxygen_saturation: oxygenSaturation ? parseFloat(oxygenSaturation) : null,
        },
      });

      HapticFeedback.success();
      Alert.alert(
        'Sucesso',
        'Evolução atualizada com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      // Never log PHI content - only log error type
      console.error('Error updating evolution - encryption or save failed');
      HapticFeedback.error();
      Alert.alert('Erro', 'Não foi possível atualizar a evolução. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }, [
    subjective,
    assessment,
    inspection,
    palpation,
    postureAnalysis,
    movementTests,
    specialTests,
    shortTermGoals,
    longTermGoals,
    interventions,
    frequency,
    duration,
    bloodPressure,
    heartRate,
    temperature,
    respiratoryRate,
    oxygenSaturation,
    evolutionId,
    router,
  ]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Editar Evolução</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Session Info */}
          {evolution && (
            <Card style={styles.sessionCard}>
              <View style={styles.sessionInfo}>
                <View style={styles.sessionInfoItem}>
                  <Text style={[styles.sessionInfoLabel, { color: colors.textSecondary }]}>
                    Sessão nº
                  </Text>
                  <Text style={[styles.sessionInfoValue, { color: colors.text }]}>
                    {evolution.sessionNumber}
                  </Text>
                </View>
                <View style={styles.sessionInfoItem}>
                  <Text style={[styles.sessionInfoLabel, { color: colors.textSecondary }]}>
                    Data original
                  </Text>
                  <Text style={[styles.sessionInfoValue, { color: colors.text }]}>
                    {format(new Date(evolution.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Subjective */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="message-square" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Subjetivo (S)</Text>
            </View>
            <Card style={styles.card}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Queixa principal do paciente
              </Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
                placeholder="Descreva a queixa do paciente..."
                placeholderTextColor={colors.textSecondary}
                value={subjective}
                onChangeText={setSubjective}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </Card>
          </View>

          {/* Objective */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="activity" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Objetivo (O)</Text>
            </View>

            {/* Vital Signs */}
            <VitalSignsInput
              bloodPressure={bloodPressure}
              onBloodPressureChange={setBloodPressure}
              heartRate={heartRate}
              onHeartRateChange={setHeartRate}
              temperature={temperature}
              onTemperatureChange={setTemperature}
              respiratoryRate={respiratoryRate}
              onRespiratoryRateChange={setRespiratoryRate}
              oxygenSaturation={oxygenSaturation}
              onOxygenSaturationChange={setOxygenSaturation}
            />

            {/* Physical Exam */}
            <ObjectiveExamForm
              inspection={inspection}
              onInspectionChange={setInspection}
              palpation={palpation}
              onPalpationChange={setPalpation}
              postureAnalysis={postureAnalysis}
              onPostureAnalysisChange={setPostureAnalysis}
              movementTests={movementTests}
              onMovementTestsChange={setMovementTests}
              specialTests={specialTests}
              onSpecialTestsChange={setSpecialTests}
              colors={colors}
            />
          </View>

          {/* Assessment */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="stethoscope" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Avaliação (A)</Text>
            </View>
            <Card style={styles.card}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Diagnóstico / Avaliação fisioterapêutica
              </Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
                placeholder="Descreva sua avaliação..."
                placeholderTextColor={colors.textSecondary}
                value={assessment}
                onChangeText={setAssessment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </Card>
          </View>

          {/* Plan */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="clipboard-list" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Plano (P)</Text>
            </View>

            <Card style={styles.card}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Metas de curto prazo
              </Text>
              <GoalInput
                goals={shortTermGoals}
                onChange={setShortTermGoals}
                placeholder="Ex: Reduzir dor de 8 para 4 em 1 semana"
                colors={colors}
              />

              <Text style={[styles.sectionLabel, { color: colors.textSecondary }, styles.marginTop]}>
                Metas de longo prazo
              </Text>
              <GoalInput
                goals={longTermGoals}
                onChange={setLongTermGoals}
                placeholder="Ex: Retornar às atividades esportivas em 6 semanas"
                colors={colors}
              />

              <Text style={[styles.sectionLabel, { color: colors.textSecondary }, styles.marginTop]}>
                Intervenções propostas
              </Text>
              <GoalInput
                goals={interventions}
                onChange={setInterventions}
                placeholder="Ex: Mobilização vertebral, exercícios de fortalecimento"
                colors={colors}
              />

              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    Frequência
                  </Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    placeholder="2x/sem"
                    placeholderTextColor={colors.textSecondary}
                    value={frequency}
                    onChangeText={setFrequency}
                  />
                </View>
                <View style={styles.half}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    Duração estimada
                  </Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    placeholder="4 semanas"
                    placeholderTextColor={colors.textSecondary}
                    value={duration}
                    onChangeText={setDuration}
                  />
                </View>
              </View>
            </Card>
          </View>

          {/* Signature - Read Only */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="pen-tool" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Assinatura Original</Text>
            </View>

            <Card style={styles.signatureCard}>
              {signature ? (
                <View style={styles.signedContainer}>
                  <Icon name="check-circle" size={32} color={colors.success} />
                  <Text style={[styles.signedText, { color: colors.success }]}>
                    Documento assinado em {format(new Date(evolution?.signedAt || new Date()), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </Text>
                  <Text style={[styles.signedNote, { color: colors.textSecondary }]}>
                    Assinaturas não podem ser alteradas
                  </Text>
                </View>
              ) : (
                <Text style={[styles.noSignatureText, { color: colors.textSecondary }]}>
                  Sem assinatura registrada
                </Text>
              )}
            </Card>
          </View>

          {/* Save Button */}
          <Button
            variant="primary"
            size="lg"
            onPress={handleSave}
            loading={saving}
            style={styles.saveButton}
          >
            Salvar Alterações
          </Button>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Goal Input Component
function GoalInput({
  goals,
  onChange,
  placeholder,
  colors,
}: {
  goals: string[];
  onChange: (goals: string[]) => void;
  placeholder: string;
  colors: any;
}) {
  const [inputValue, setInputValue] = useState('');

  const addGoal = () => {
    if (inputValue.trim()) {
      onChange([...goals, inputValue.trim()]);
      setInputValue('');
      HapticFeedback.light();
    }
  };

  const removeGoal = (index: number) => {
    onChange(goals.filter((_, i) => i !== index));
    HapticFeedback.light();
  };

  return (
    <View style={styles.goalsContainer}>
      <View style={styles.goalInputRow}>
        <TextInput
          style={[styles.goalInput, { color: colors.text, borderColor: colors.border }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={addGoal}
        />
        <Pressable
          onPress={addGoal}
          style={[styles.addGoalButton, { backgroundColor: colors.primary }]}
        >
          <Icon name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {goals.map((goal, index) => (
        <View key={index} style={[styles.goalItem, { backgroundColor: colors.card }]}>
          <Text style={[styles.goalText, { color: colors.text }]}>{goal}</Text>
          <Pressable onPress={() => removeGoal(index)}>
            <Icon name="x" size={16} color={colors.error} />
          </Pressable>
        </View>
      ))}
    </View>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  keyboardAvoidingView: {
    flex: 1,
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
  sessionInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  sessionInfoItem: {
    flex: 1,
  },
  sessionInfoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  sessionInfoValue: {
    fontSize: 14,
    fontWeight: '600',
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
  sectionLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  card: {
    padding: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
  },
  marginTop: {
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  goalsContainer: {
    gap: 8,
  },
  goalInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  goalInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  addGoalButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  goalText: {
    flex: 1,
    fontSize: 14,
    paddingRight: 8,
  },
  signatureCard: {
    padding: 16,
  },
  signedContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  signedText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  signedNote: {
    fontSize: 13,
    marginTop: 4,
  },
  noSignatureText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  saveButton: {
    marginTop: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});
