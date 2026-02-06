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
import { ObjectiveExamForm } from '@/components/ObjectiveExamForm';
import { VitalSignsInput } from '@/components/VitalSignsInput';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { HapticFeedback } from '@/lib/haptics';
import { doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function NewEvaluationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const { profile } = useAuth();

  const patientId = params.patientId as string;
  const appointmentId = params.appointmentId as string;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState<any>(null);

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

  useEffect(() => {
    if (patientId) {
      loadPatient();
    }
  }, [patientId]);

  const loadPatient = async () => {
    try {
      const docRef = doc(db, 'patients', patientId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setPatient({ id: docSnap.id, ...docSnap.data() });
      }
    } catch (error) {
      console.error('Error loading patient:', error);
    }
  };

  const handleSave = useCallback(async () => {
    if (!chiefComplaint.trim()) {
      Alert.alert('Campo obrigatório', 'Preencha a queixa principal.');
      return;
    }

    try {
      setSaving(true);
      HapticFeedback.heavy();

      const evaluationId = doc(collection(db, 'evaluations')).id;

      await setDoc(doc(db, 'evaluations', evaluationId), {
        id: evaluationId,
        patient_id: patientId,
        appointment_id: appointmentId,
        created_by: profile?.id,
        created_at: serverTimestamp(),

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
      });

      HapticFeedback.success();
      Alert.alert(
        'Avaliação Registrada',
        'A avaliação foi salva com sucesso!',
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
    patientId,
    appointmentId,
    profile?.id,
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Nova Avaliação</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Patient Info */}
        {patient && (
          <Card style={styles.patientCard}>
            <Text style={[styles.patientName, { color: colors.text }]}>
              {patient.name || patient.full_name}
            </Text>
            <Text style={[styles.patientDetails, { color: colors.textSecondary }]}>
              {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Text>
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
          <Label label="Diagnóstico" required colors={colors} />
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
          Salvar Avaliação
        </Button>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ icon, title, colors }: { icon: string; title: string; colors: any }) {
  return (
    <View style={styles.sectionHeader}>
      <Icon name={icon as any} size={20} color={colors.primary} />
      <Text style={[styles.sectionTitleText, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

function Label({ label, required, colors }: { label: string; required?: boolean; colors: any }) {
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
  colors: any;
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
  patientName: {
    fontSize: 18,
    fontWeight: '700',
  },
  patientDetails: {
    fontSize: 14,
    marginTop: 4,
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
