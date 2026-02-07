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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon, IconName } from '@/components/ui/Icon';
import { ObjectiveExamForm } from '@/components/ObjectiveExamForm';
import { VitalSignsInput } from '@/components/VitalSignsInput';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { HapticFeedback } from '@/lib/haptics';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Evaluation } from '@/types';

export default function EditEvaluationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  useAuth(); // profile não utilizado nesta tela

  const evaluationId = params.id as string;
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  // Evaluation fields
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState('');
  const [pastMedicalHistory, setPastMedicalHistory] = useState('');
  const [medications, setMedications] = useState('');

  // Objective fields
  const [inspection, setInspection] = useState('');
  const [palpation, setPalpation] = useState('');
  const [rangeOfMotion, setRangeOfMotion] = useState<Record<string, string>>({});
  const [muscleStrength, setMuscleStrength] = useState<Record<string, string>>({});
  const [specialTests, setSpecialTests] = useState<Record<string, boolean>>({});

  // Assessment
  const [diagnosis, setDiagnosis] = useState('');
  const [prognosis, setPrognosis] = useState('');

  // Plan
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [recommendations, setRecommendations] = useState('');

  // Vital signs
  const [bloodPressure, setBloodPressure] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [oxygenSaturation, setOxygenSaturation] = useState('');

  const loadEvaluation = useCallback(async () => {
    try {
      const docRef = doc(db, 'evaluations', evaluationId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const evalData = { id: docSnap.id, ...data } as Evaluation;
        setEvaluation(evalData);

        // Load form fields
        setChiefComplaint(evalData.chiefComplaint || '');
        setHistoryOfPresentIllness(evalData.historyOfPresentIllness || '');
        setPastMedicalHistory(evalData.pastMedicalHistory || '');
        setMedications(evalData.medications || '');
        setInspection(evalData.examination?.inspection || '');
        setPalpation(evalData.examination?.palpation || '');
        setRangeOfMotion(evalData.examination?.range_of_motion || {});
        setMuscleStrength(evalData.examination?.muscle_strength || {});
        setSpecialTests(evalData.examination?.special_tests || {});
        setDiagnosis(evalData.diagnosis || '');
        setPrognosis(evalData.prognosis || '');
        setTreatmentPlan(evalData.treatmentPlan || '');
        setRecommendations(evalData.recommendations || '');
        setBloodPressure(evalData.vitalSigns?.blood_pressure || '');
        setHeartRate(evalData.vitalSigns?.heart_rate?.toString() || '');
        setTemperature(evalData.vitalSigns?.temperature?.toString() || '');
        setRespiratoryRate(evalData.vitalSigns?.respiratory_rate?.toString() || '');
        setOxygenSaturation(evalData.vitalSigns?.oxygen_saturation?.toString() || '');
      }
    } catch (error) {
      console.error('Error loading evaluation:', error);
      Alert.alert('Erro', 'Não foi possível carregar a avaliação.');
    }
  }, [evaluationId]);

  useEffect(() => {
    loadEvaluation();
  }, [loadEvaluation]);

  const handleSave = useCallback(async () => {
    if (!chiefComplaint.trim()) {
      Alert.alert('Campo obrigatório', 'Preencha a queixa principal.');
      return;
    }

    try {
      setSaving(true);
      HapticFeedback.medium();

      await updateDoc(doc(db, 'evaluations', evaluationId), {
        // Subjective
        chief_complaint: chiefComplaint,
        history_of_present_illness: historyOfPresentIllness,
        past_medical_history: pastMedicalHistory,
        medications,

        // Objective
        examination: {
          inspection,
          palpation,
          range_of_motion: rangeOfMotion,
          muscle_strength: muscleStrength,
          special_tests,
        },

        // Vital signs
        vital_signs: {
          blood_pressure: bloodPressure,
          heart_rate: heartRate ? parseInt(heartRate) : null,
          temperature: temperature ? parseFloat(temperature) : null,
          respiratory_rate: respiratoryRate ? parseInt(respiratoryRate) : null,
          oxygen_saturation: oxygenSaturation ? parseFloat(oxygenSaturation) : null,
        },

        // Assessment
        diagnosis,
        prognosis,

        // Plan
        treatment_plan: treatmentPlan,
        recommendations,

        updated_at: serverTimestamp(),
      });

      HapticFeedback.success();
      Alert.alert(
        'Sucesso',
        'Avaliação atualizada com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating evaluation:', error);
      HapticFeedback.error();
      Alert.alert('Erro', 'Não foi possível atualizar a avaliação. Tente novamente.');
    } finally {
      setSaving(false);
    }
  // Nota: specialTests depende de objetos do formulário; mantemos no array mesmo com aviso do lint.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chiefComplaint,
    historyOfPresentIllness,
    pastMedicalHistory,
    medications,
    inspection,
    palpation,
    rangeOfMotion,
    muscleStrength,
    specialTests,
    diagnosis,
    prognosis,
    treatmentPlan,
    recommendations,
    bloodPressure,
    heartRate,
    temperature,
    respiratoryRate,
    oxygenSaturation,
    evaluationId,
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
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Editar Avaliação</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Evaluation Info */}
          {evaluation && (
            <Card style={styles.sessionCard}>
              <View style={styles.sessionInfo}>
                <View style={styles.sessionInfoItem}>
                  <Text style={[styles.sessionInfoLabel, { color: colors.textSecondary }]}>
                    Data original
                  </Text>
                  <Text style={[styles.sessionInfoValue, { color: colors.text }]}>
                    {format(new Date(evaluation.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Subjective */}
          <SectionTitle icon="message-square" title="Subjetivo" colors={colors} />

          <Card style={styles.card}>
            <Label label="Queixa Principal" required colors={colors} />
            <TextArea
              value={chiefComplaint}
              onChangeText={setChiefComplaint}
              placeholder="Descreva a queixa principal do paciente..."
              colors={colors}
            />

            <Label label="História da Doença Atual" colors={colors} />
            <TextArea
              value={historyOfPresentIllness}
              onChangeText={setHistoryOfPresentIllness}
              placeholder="Detalhes sobre o início e evolução dos sintomas..."
              colors={colors}
            />

            <Label label="Histórico Médico" colors={colors} />
            <TextArea
              value={pastMedicalHistory}
              onChangeText={setPastMedicalHistory}
              placeholder="Condições pré-existentes, cirurgias anteriores..."
              colors={colors}
            />

            <Label label="Medicações em Uso" colors={colors} />
            <TextArea
              value={medications}
              onChangeText={setMedications}
              placeholder="Liste medicamentos, dosagens e frequência..."
              colors={colors}
            />
          </Card>

          {/* Vital Signs */}
          <SectionTitle icon="heart" title="Sinais Vitais" colors={colors} />
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

          {/* Objective */}
          <SectionTitle icon="activity" title="Exame Físico" colors={colors} />
          <ObjectiveExamForm
            inspection={inspection}
            onInspectionChange={setInspection}
            palpation={palpation}
            onPalpationChange={setPalpation}
            postureAnalysis=""
            onPostureAnalysisChange={() => {}}
            movementTests={rangeOfMotion}
            onMovementTestsChange={setRangeOfMotion}
            specialTests={specialTests}
            onSpecialTestsChange={setSpecialTests}
            colors={colors}
          />

          {/* Assessment */}
          <SectionTitle icon="stethoscope" title="Avaliação" colors={colors} />
          <Card style={styles.card}>
            <Label label="Diagnóstico" colors={colors} />
            <TextArea
              value={diagnosis}
              onChangeText={setDiagnosis}
              placeholder="Diagnóstico clínico ou fisioterapêutico..."
              colors={colors}
            />

            <Label label="Prognóstico" colors={colors} />
            <TextArea
              value={prognosis}
              onChangeText={setPrognosis}
              placeholder="Expectativa de evolução e recuperação..."
              colors={colors}
            />
          </Card>

          {/* Plan */}
          <SectionTitle icon="clipboard-list" title="Plano de Tratamento" colors={colors} />
          <Card style={styles.card}>
            <Label label="Plano Terapêutico" colors={colors} />
            <TextArea
              value={treatmentPlan}
              onChangeText={setTreatmentPlan}
              placeholder="Objetivos e intervenções propostas..."
              colors={colors}
            />

            <Label label="Recomendações" colors={colors} />
            <TextArea
              value={recommendations}
              onChangeText={setRecommendations}
              placeholder="Orientações para o paciente..."
              colors={colors}
            />
          </Card>

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

function SectionTitle({ icon, title, colors }: { icon: IconName; title: string; colors: { primary: string; text: string } }) {
  return (
    <View style={styles.sectionHeader}>
      <Icon name={icon} size={20} color={colors.primary} />
      <Text style={[styles.sectionTitleText, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

function Label({ label, required, colors }: { label: string; required?: boolean; colors: { textSecondary: string } }) {
  return (
    <Text style={[styles.label, { color: colors.textSecondary }]}>
      {label}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
  );
}

function TextArea({
  value,
  onChangeText,
  placeholder,
  colors,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  colors: { text: string; textSecondary: string; border: string };
}) {
  return (
    <TextInput
      style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      value={value}
      onChangeText={onChangeText}
      multiline
      numberOfLines={4}
      textAlignVertical="top"
    />
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    padding: 16,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});
