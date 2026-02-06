import { useState, useCallback, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DragListRenderItem } from 'react-native-draglist';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ExerciseSelector } from '@/components/ExerciseSelector';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useExercises } from '@/hooks/useExercises';
import { HapticFeedback } from '@/lib/haptics';
import { doc, setDoc, serverTimestamp, collection, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Exercise } from '@/types';

interface ExercisePlanItem {
  exerciseId: string;
  exercise: Exercise | null;
  sets: number;
  reps: number;
  restTime: number;
  notes?: string;
}

export default function NewExercisePlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { data: availableExercises } = useExercises();

  const patientId = params.patientId as string;
  const [patientName, setPatientName] = useState('');

  const [loading, saving, setSaving] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planItems, setPlanItems] = useState<ExercisePlanItem[]>([]);

  useEffect(() => {
    if (patientId) {
      loadPatientName();
    }
  }, [patientId]);

  const loadPatientName = async () => {
    try {
      const docRef = doc(db, 'patients', patientId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPatientName(data.name || data.full_name || '');
      }
    } catch (error) {
      console.error('Error loading patient:', error);
    }
  };

  const handleAddExercise = useCallback((exercise: Exercise) => {
    HapticFeedback.light();
    const newItem: ExercisePlanItem = {
      exerciseId: exercise.id,
      exercise,
      sets: 3,
      reps: 12,
      restTime: 60,
    };
    setPlanItems([...planItems, newItem]);
  }, [planItems]);

  const handleRemoveExercise = useCallback((index: number) => {
    HapticFeedback.light();
    setPlanItems(planItems.filter((_, i) => i !== index));
  }, [planItems]);

  const handleUpdateItem = useCallback((index: number, updates: Partial<ExercisePlanItem>) => {
    HapticFeedback.selection();
    const newItems = [...planItems];
    newItems[index] = { ...newItems[index], ...updates };
    setPlanItems(newItems);
  }, [planItems]);

  const handleReorder = useCallback((from: number, to: number) => {
    HapticFeedback.selection();
    const newItems = [...planItems];
    const [removed] = newItems.splice(from, 1);
    newItems.splice(to, 0, removed);
    setPlanItems(newItems);
  }, []);

  const validate = useCallback(() => {
    if (!planName.trim()) {
      Alert.alert('Campo obrigatório', 'Digite o nome do plano.');
      return false;
    }
    if (planItems.length === 0) {
      Alert.alert('Exercícios', 'Adicione pelo menos um exercício ao plano.');
      return false;
    }
    return true;
  }, [planName, planItems.length]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      HapticFeedback.medium();

      const planId = doc(collection(db, 'exercise_plans')).id;

      await setDoc(doc(db, 'exercise_plans', planId), {
        id: planId,
        name: planName.trim(),
        description: planDescription.trim(),
        patient_id: patientId,
        patient_name: patientName,
        created_by: profile?.id,
        created_by_name: profile?.full_name,
        exercises: planItems.map((item) => ({
          exercise_id: item.exerciseId,
          exercise_name: item.exercise?.name || '',
          sets: item.sets,
          reps: item.reps,
          rest_time: item.restTime,
          notes: item.notes || null,
        })),
        exercise_count: planItems.length,
        total_sets: planItems.reduce((sum, item) => sum + item.sets, 0),
        status: 'Ativo',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      HapticFeedback.success();
      Alert.alert('Sucesso', 'Plano de exercícios criado com sucesso!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error saving plan:', error);
      HapticFeedback.error();
      Alert.alert('Erro', 'Não foi possível salvar o plano.');
    } finally {
      setSaving(false);
    }
  }, [planName, planDescription, planItems, patientId, patientName, profile, validate, router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="x" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Novo Plano de Exercícios</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Patient Info */}
        {patientName && (
          <Card style={styles.patientCard}>
            <View style={styles.patientInfo}>
              <Icon name="user" size={20} color={colors.primary} />
              <Text style={[styles.patientNameText, { color: colors.text }]}>{patientName}</Text>
            </View>
          </Card>
        )}

        {/* Plan Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Informações do Plano</Text>

          <Card style={styles.card}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Nome do Plano *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="Ex: Plano de reabilitação de joelho - Fase 1"
                placeholderTextColor={colors.textSecondary}
                value={planName}
                onChangeText={setPlanName}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Descrição</Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
                placeholder="Objetivos, duração esperada, recomendações..."
                placeholderTextColor={colors.textSecondary}
                value={planDescription}
                onChangeText={setPlanDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </Card>
        </View>

        {/* Exercises */}
        <View style={styles.section}>
          <View style={styles.exercisesHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Exercícios</Text>
            <Text style={[styles.exerciseCount, { color: colors.textSecondary }]}>
              {planItems.length} exercício{planItems.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Exercise List */}
          {planItems.length === 0 ? (
            <Card style={styles.emptyCard} onPress={() => router.push('/exercises/select')}>
              <Icon name="dumbbell" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Toque para adicionar exercícios
              </Text>
            </Card>
          ) : (
            <DragListRenderItem
              data={planItems}
              keyExtractor={(item) => item.exerciseId}
              onReorder={handleReorder}
              renderItem={(info) => (
                <ExercisePlanItemCard
                  item={info.item}
                  index={info.index}
                  onUpdate={(updates) => handleUpdateItem(info.index, updates)}
                  onRemove={() => handleRemoveExercise(info.index)}
                  colors={colors}
                />
              )}
            />
          )}

          {/* Add Exercise Button */}
          <Pressable
            onPress={() => router.push('/exercises/select')}
            style={({ pressed }) => [
              styles.addExerciseButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Icon name="plus-circle" size={20} color={colors.primary} />
            <Text style={[styles.addExerciseText, { color: colors.primary }]}>Adicionar Exercício</Text>
          </Pressable>
        </View>

        {/* Summary */}
        {planItems.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Resumo</Text>
            <Card style={styles.summaryCard}>
              <SummaryRow label="Total de exercícios" value={planItems.length} colors={colors} />
              <SummaryRow
                label="Total de séries"
                value={planItems.reduce((sum, item) => sum + item.sets, 0)}
                colors={colors}
              />
              <SummaryRow
                label="Tempo estimado"
                value={`${Math.ceil(planItems.reduce((sum, item) => sum + (item.sets * item.reps) + (item.sets - 1) * (item.restTime / 60), 0) / 60)} min`}
                colors={colors}
              />
            </Card>
          </View>
        )}

        {/* Save Button */}
        <Button
          variant="primary"
          size="lg"
          onPress={handleSave}
          loading={saving}
          disabled={planItems.length === 0}
          style={styles.saveButton}
        >
          Salvar Plano
        </Button>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ExercisePlanItemCard({
  item,
  index,
  onUpdate,
  onRemove,
  colors,
}: {
  item: ExercisePlanItem;
  index: number;
  onUpdate: (updates: Partial<ExercisePlanItem>) => void;
  onRemove: () => void;
  colors: any;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card style={styles.exerciseCard}>
      <Pressable onPress={() => setExpanded(!expanded)}>
        <View style={styles.exerciseCardHeader}>
          <View style={styles.dragHandle}>
            <Icon name="grip-vertical" size={20} color={colors.textSecondary} />
          </View>

          {item.exercise?.image_url || item.exercise?.video_url ? (
            <Image
              source={{ uri: item.exercise.image_url || item.exercise.video_url || '' }}
              style={styles.exerciseThumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.exerciseThumbnail, styles.exerciseThumbnailPlaceholder]}>
              <Icon name="dumbbell" size={24} color={colors.textSecondary} />
            </View>
          )}

          <View style={styles.exerciseCardInfo}>
            <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
              {item.exercise?.name || 'Exercício'}
            </Text>
            <Text style={[styles.exerciseMeta, { color: colors.textSecondary }]}>
              {item.sets} séries × {item.reps} reps • {item.restTime}s descanso
            </Text>
          </View>

          <Pressable onPress={(e) => { e.stopPropagation(); onRemove(); }}>
            <Icon name="x-circle" size={20} color={colors.error} />
          </Pressable>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.exerciseCardDetails}>
          <ExerciseSettingRow
            label="Séries"
            value={item.sets}
            onChange={(val) => onUpdate({ sets: val })}
            min={1}
            max={10}
            colors={colors}
          />
          <ExerciseSettingRow
            label="Repetições"
            value={item.reps}
            onChange={(val) => onUpdate({ reps: val })}
            min={1}
            max={50}
            colors={colors}
          />
          <ExerciseSettingRow
            label="Descanso (seg)"
            value={item.restTime}
            onChange={(val) => onUpdate({ restTime: val })}
            min={15}
            max={180}
            step={15}
            colors={colors}
          />

          <View style={styles.notesField}>
            <Text style={[styles.label, { color: colors.text }]}>Observações</Text>
            <TextInput
              style={[styles.notesInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Instruções especiais..."
              placeholderTextColor={colors.textSecondary}
              value={item.notes || ''}
              onChangeText={(val) => onUpdate({ notes: val })}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>
        </View>
      )}
    </Card>
  );
}

function ExerciseSettingRow({
  label,
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  colors,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  colors: any;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.settingControls}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - step))}
          style={[styles.settingButton, { backgroundColor: colors.card }]}
        >
          <Icon name="minus" size={18} color={colors.text} />
        </Pressable>
        <Text style={[styles.settingValue, { color: colors.text }]}>{value}</Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + step))}
          style={[styles.settingButton, { backgroundColor: colors.card }]}
        >
          <Icon name="plus" size={18} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function SummaryRow({ label, value, colors }: { label: string; value: string | number; colors: any }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.text }]}>{value}</Text>
    </View>
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
    paddingBottom: 32,
  },
  patientCard: {
    padding: 12,
    marginBottom: 24,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseCount: {
    fontSize: 14,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  exerciseCard: {
    padding: 12,
    marginBottom: 12,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dragHandle: {
    padding: 4,
  },
  exerciseThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  exerciseThumbnailPlaceholder: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseCardInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseMeta: {
    fontSize: 13,
  },
  exerciseCardDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'center',
  },
  notesField: {
    marginTop: 4,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 60,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addExerciseText: {
    fontSize: 15,
    fontWeight: '600',
  },
  summaryCard: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});
