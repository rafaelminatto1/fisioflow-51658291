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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useCreatePROM, getScaleInfo } from '@/hooks/usePROMs';
import { useAuthStore } from '@/store/auth';

// ── Per-scale question definitions ────────────────────────────────────────────

type QuestionType = 'slider' | 'radio';

interface ScaleQuestion {
  id: string;
  label: string;
  type: QuestionType;
  options?: { label: string; value: number }[];
  min?: number;
  max?: number;
}

const SCALE_QUESTIONS: Record<string, ScaleQuestion[]> = {
  VAS: [
    {
      id: 'pain',
      label: 'Nível de dor atual (0 = sem dor, 10 = pior dor imaginável)',
      type: 'radio',
      options: Array.from({ length: 11 }, (_, i) => ({ label: String(i), value: i })),
    },
  ],
  PSFS: [
    {
      id: 'activity1',
      label: 'Atividade 1 — Dificuldade (0 = incapaz, 10 = nível pré-lesão)',
      type: 'radio',
      options: Array.from({ length: 11 }, (_, i) => ({ label: String(i), value: i })),
    },
    {
      id: 'activity2',
      label: 'Atividade 2 — Dificuldade',
      type: 'radio',
      options: Array.from({ length: 11 }, (_, i) => ({ label: String(i), value: i })),
    },
    {
      id: 'activity3',
      label: 'Atividade 3 — Dificuldade',
      type: 'radio',
      options: Array.from({ length: 11 }, (_, i) => ({ label: String(i), value: i })),
    },
  ],
  DASH: [
    { id: 'score', label: 'Pontuação total DASH (0–100)', type: 'slider', min: 0, max: 100 },
  ],
  OSWESTRY: [
    { id: 'score', label: 'Pontuação Oswestry (0–100%)', type: 'slider', min: 0, max: 100 },
  ],
  NDI: [
    { id: 'score', label: 'Pontuação NDI (0–100%)', type: 'slider', min: 0, max: 100 },
  ],
  LEFS: [
    { id: 'score', label: 'Pontuação LEFS (0–80)', type: 'slider', min: 0, max: 80 },
  ],
  BERG: [
    { id: 'score', label: 'Pontuação Berg Balance (0–56)', type: 'slider', min: 0, max: 56 },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function PromForm() {
  const { patientId, patientName, scaleId } = useLocalSearchParams<{
    patientId: string;
    patientName: string;
    scaleId: string;
  }>();
  const colors = useColors();
  const { light, medium, success, error: hapticError } = useHaptics();
  const { user } = useAuthStore();
  const createMutation = useCreatePROM();

  const scale = getScaleInfo(scaleId);
  const questions = SCALE_QUESTIONS[scaleId] ?? [];

  const [responses, setResponses] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');

  const allAnswered = questions.every((q) => responses[q.id] !== undefined);

  const computeScore = (): number => {
    if (scaleId === 'PSFS') {
      const vals = Object.values(responses);
      return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    }
    return responses[questions[0]?.id] ?? 0;
  };

  const handleSubmit = async () => {
    light();
    if (!allAnswered) {
      Alert.alert('Atenção', 'Responda todas as questões antes de salvar.');
      hapticError();
      return;
    }
    medium();

    const score = computeScore();
    const scaleInfo = getScaleInfo(scaleId);
    const interpretation = scaleInfo?.interpretation(score);

    try {
      await createMutation.mutateAsync({
        patient_id: patientId,
        scale_name: scaleId,
        score,
        interpretation: interpretation ?? null,
        responses,
        applied_at: new Date().toISOString(),
        applied_by: user?.id ?? null,
        notes: notes || null,
      });
      success();
      Alert.alert('Salvo!', `Escala ${scale?.shortName} registrada com score ${score}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      hapticError();
      Alert.alert('Erro', e.message ?? 'Não foi possível salvar a escala.');
    }
  };

  if (!scale) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Escala não encontrada.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: scale.shortName,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header info */}
          <View style={[styles.infoBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Text style={[styles.infoTitle, { color: colors.primary }]}>{scale.name}</Text>
            <Text style={[styles.infoDesc, { color: colors.primary }]}>{scale.description}</Text>
            {patientName && (
              <Text style={[styles.infoPatient, { color: colors.primary }]}>Paciente: {patientName}</Text>
            )}
          </View>

          {/* Questions */}
          {questions.map((q) => (
            <View key={q.id} style={styles.questionBlock}>
              <Text style={[styles.questionLabel, { color: colors.text }]}>{q.label}</Text>

              {q.type === 'radio' && q.options && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsRow}>
                  {q.options.map((opt) => {
                    const selected = responses[q.id] === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.optionBtn,
                          {
                            backgroundColor: selected ? colors.primary : colors.surface,
                            borderColor: selected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => {
                          light();
                          setResponses((prev) => ({ ...prev, [q.id]: opt.value }));
                        }}
                      >
                        <Text style={[styles.optionText, { color: selected ? '#fff' : colors.text }]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {q.type === 'slider' && (
                <View style={styles.numericInputRow}>
                  <TextInput
                    style={[styles.numericInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    keyboardType="numeric"
                    placeholder={`${q.min}–${q.max}`}
                    placeholderTextColor={colors.textMuted}
                    value={responses[q.id] !== undefined ? String(responses[q.id]) : ''}
                    onChangeText={(text) => {
                      const val = parseInt(text, 10);
                      if (!isNaN(val) && val >= (q.min ?? 0) && val <= (q.max ?? 100)) {
                        setResponses((prev) => ({ ...prev, [q.id]: val }));
                      } else if (text === '') {
                        setResponses((prev) => {
                          const next = { ...prev };
                          delete next[q.id];
                          return next;
                        });
                      }
                    }}
                  />
                  <Text style={[styles.numericRange, { color: colors.textSecondary }]}>
                    Máx: {q.max}
                  </Text>
                </View>
              )}
            </View>
          ))}

          {/* Score preview */}
          {allAnswered && (
            <View style={[styles.scorePreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.scorePreviewLabel, { color: colors.textSecondary }]}>Score calculado</Text>
              <Text style={[styles.scorePreviewValue, { color: colors.primary }]}>
                {computeScore()} {scale.unit}
              </Text>
              <Text style={[styles.scorePreviewInterpretation, { color: colors.text }]}>
                {scale.interpretation(computeScore())}
              </Text>
            </View>
          )}

          {/* Notes */}
          <View style={styles.notesBlock}>
            <Text style={[styles.questionLabel, { color: colors.text }]}>Observações (opcional)</Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              multiline
              numberOfLines={3}
              placeholder="Adicione observações clínicas..."
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: allAnswered ? colors.primary : colors.border },
            ]}
            onPress={handleSubmit}
            disabled={!allAnswered || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Salvar Escala</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  errorText: { padding: 24, fontSize: 16, textAlign: 'center' },
  infoBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  infoTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  infoDesc: { fontSize: 13, marginBottom: 4 },
  infoPatient: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  questionBlock: { marginBottom: 24 },
  questionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10, lineHeight: 20 },
  optionsRow: { flexGrow: 0, marginBottom: 4 },
  optionBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  optionText: { fontSize: 15, fontWeight: '600' },
  numericInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numericInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    width: 100,
    textAlign: 'center',
  },
  numericRange: { fontSize: 13 },
  scorePreview: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  scorePreviewLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  scorePreviewValue: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
  scorePreviewInterpretation: { fontSize: 14, fontWeight: '500' },
  notesBlock: { marginBottom: 24 },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
