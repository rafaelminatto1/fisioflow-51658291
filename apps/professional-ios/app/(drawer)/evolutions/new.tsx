import { useState, useCallback, useRef } from 'react';

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
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { VitalSignsInput } from '@/components/VitalSignsInput';
import { ObjectiveExamForm } from '@/components/ObjectiveExamForm';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { HapticFeedback } from '@/lib/haptics';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function NewEvolutionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const { profile } = useAuth();

  const patientId = params.patientId as string;
  const appointmentId = params.appointmentId as string;

  const [loading, saving, setSaving] = useState(false);
  const [sessionNumber, setSessionNumber] = useState(1);

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

  // Signature
  const signatureRef = useRef<any>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    // Validation
    if (!subjective.trim()) {
      Alert.alert('Campo obrigatório', 'Preencha o campo Subjetivo (queixa do paciente).');
      return;
    }

    if (!assessment.trim()) {
      Alert.alert('Campo obrigatório', 'Preencha o campo Avaliação.');
      return;
    }

    if (!signature) {
      Alert.alert('Assinatura obrigatória', 'Por favor, assine o registro.');
      return;
    }

    try {
      setSaving(true);
      HapticFeedback.medium();

      const evolutionId = doc(collection(db, 'evolutions')).id;

      await setDoc(doc(db, 'evolutions', evolutionId), {
        id: evolutionId,
        patient_id: patientId,
        appointment_id: appointmentId,
        session_number: sessionNumber,
        subjective,
        objective: {
          inspection,
          palpation,
          movement_tests: movementTests,
          special_tests: specialTests,
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
        vital_signs: {
          blood_pressure: bloodPressure,
          heart_rate: heartRate ? parseInt(heartRate) : null,
          temperature: temperature ? parseFloat(temperature) : null,
          respiratory_rate: respiratoryRate ? parseInt(respiratoryRate) : null,
          oxygen_saturation: oxygenSaturation ? parseFloat(oxygenSaturation) : null,
        },
        created_by: profile?.id,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        signature_hash: signature,
        signed_at: serverTimestamp(),
      });

      HapticFeedback.success();
      Alert.alert(
        'Sucesso',
        'Evolução registrada com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving evolution:', error);
      HapticFeedback.error();
      Alert.alert('Erro', 'Não foi possível salvar a evolução. Tente novamente.');
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
    signature,
    patientId,
    appointmentId,
    sessionNumber,
    profile?.id,
    router,
  ]);

  const handleClearSignature = useCallback(() => {
    HapticFeedback.light();
    signatureRef.current?.clearSignature();
    setSignature(null);
  }, []);

  const handleSignatureEnd = useCallback((signatureData: string) => {
    setSignature(signatureData);
  }, []);

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Nova Evolução</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Session Info */}
          <Card style={styles.sessionCard}>
            <View style={styles.sessionInfo}>
              <View style={styles.sessionInfoItem}>
                <Text style={[styles.sessionInfoLabel, { color: colors.textSecondary }]}>
                  Sessão nº
                </Text>
                <TextInput
                  style={[styles.sessionInput, { color: colors.text, borderColor: colors.border }]}
                  value={String(sessionNumber)}
                  onChangeText={(text) => setSessionNumber(parseInt(text) || 1)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.sessionInfoItem}>
                <Text style={[styles.sessionInfoLabel, { color: colors.textSecondary }]}>
                  Data
                </Text>
                <Text style={[styles.sessionInfoValue, { color: colors.text }]}>
                  {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </Text>
              </View>
            </View>
          </Card>

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

          {/* Signature */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="pen-tool" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Assinatura</Text>
            </View>

            <Card style={styles.signatureCard}>
              <Text style={[styles.signatureHint, { color: colors.textSecondary }]}>
                Assine abaixo para confirmar este registro
              </Text>
              <SignatureCanvas
                ref={signatureRef}
                onSignatureEnd={handleSignatureEnd}
                penColor={colors.text}
              />
              <View style={styles.signatureActions}>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={handleClearSignature}
                  leftIcon={<Icon name="x" size={16} color={colors.text} />}
                >
                  Limpar
                </Button>
                {signature && (
                  <View style={styles.signatureConfirmed}>
                    <Icon name="check-circle" size={16} color={colors.success} />
                    <Text style={[styles.signatureConfirmedText, { color: colors.success }]}>
                      Assinatura confirmada
                    </Text>
                  </View>
                )}
              </View>
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
            Salvar Evolução
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
  sessionInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600',
    width: 60,
    textAlign: 'center',
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
  signatureHint: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  signatureActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  signatureConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signatureConfirmedText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});
