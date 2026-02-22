import { useState, useEffect } from 'react';
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
import { useProtocols } from '@/hooks/useProtocols';
import { useProtocol } from '@/hooks/useProtocol';
import { Card } from '@/components';

export default function ProtocolFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { medium, success, error: hapticError } = useHaptics();

  const protocolId = params.protocolId as string | undefined;
  const isEditing = !!protocolId;

  const { create, update, isCreating, isUpdating } = useProtocols();
  const { protocol, isLoading: isLoadingProtocol } = useProtocol(protocolId || null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [isTemplate, setIsTemplate] = useState(true);
  const [exercises, setExercises] = useState<any[]>([]);

  const isSaving = isCreating || isUpdating;

  // Load protocol data when editing
  useEffect(() => {
    if (protocol && isEditing) {
      setName(protocol.name);
      setDescription(protocol.description);
      setCategory(protocol.category);
      setCondition(protocol.condition || '');
      setIsTemplate(protocol.isTemplate);
      setExercises(protocol.exercises || []);
    }
  }, [protocol, isEditing]);

  const categories = ['Ortopedia', 'Coluna', 'Neurologia', 'Cardio', 'Respiratória', 'Pediátrica'];

  const handleAddExercise = () => {
    medium();
    // Navegar para seleção de exercícios
    router.push('/exercises?selectMode=true&returnTo=protocol-form' as any);
  };

  const handleRemoveExercise = (index: number) => {
    medium();
    Alert.alert(
      'Remover Exercício',
      'Deseja remover este exercício do protocolo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            const updated = exercises.filter((_, i) => i !== index);
            setExercises(updated);
            success();
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    medium();

    if (!name.trim()) {
      hapticError();
      Alert.alert('Atenção', 'Digite um nome para o protocolo.');
      return;
    }

    if (!category) {
      hapticError();
      Alert.alert('Atenção', 'Selecione uma categoria.');
      return;
    }

    if (exercises.length === 0) {
      hapticError();
      Alert.alert('Atenção', 'Adicione pelo menos um exercício ao protocolo.');
      return;
    }

    try {
      const protocolData = {
        name: name.trim(),
        description: description.trim(),
        category,
        condition: condition.trim(),
        exercises,
        isTemplate,
        isActive: true,
        professionalId: '', // Will be set by the hook
      };

      if (isEditing && protocolId) {
        await update({ id: protocolId, data: protocolData });
      } else {
        await create(protocolData);
      }

      success();
      Alert.alert(
        'Sucesso',
        `Protocolo ${isEditing ? 'atualizado' : 'criado'} com sucesso!`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      hapticError();
      Alert.alert('Erro', err.message || 'Não foi possível salvar o protocolo.');
    }
  };

  if (isLoadingProtocol && isEditing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Carregando protocolo...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditing ? 'Editar Protocolo' : 'Novo Protocolo'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Basic Info */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Informações Básicas</Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Nome do Protocolo *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Ex: Reabilitação de Joelho"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Descreva o objetivo e aplicação do protocolo..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Categoria *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    {
                      backgroundColor: category === cat ? colors.primary : colors.background,
                      borderColor: category === cat ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    medium();
                    setCategory(cat);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      { color: category === cat ? '#fff' : colors.text },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Condição/Diagnóstico</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Ex: Pós-operatório de LCA"
              placeholderTextColor={colors.textMuted}
              value={condition}
              onChangeText={setCondition}
            />
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => {
              medium();
              setIsTemplate(!isTemplate);
            }}
          >
            <View style={[styles.checkbox, { borderColor: colors.border }]}>
              {isTemplate && <Ionicons name="checkmark" size={18} color={colors.primary} />}
            </View>
            <View style={styles.checkboxLabel}>
              <Text style={[styles.checkboxText, { color: colors.text }]}>Salvar como template</Text>
              <Text style={[styles.checkboxSubtext, { color: colors.textSecondary }]}>
                Templates podem ser reutilizados para outros pacientes
              </Text>
            </View>
          </TouchableOpacity>
        </Card>

        {/* Exercises */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Exercícios ({exercises.length})
            </Text>
            <TouchableOpacity
              style={[styles.addExerciseButton, { backgroundColor: colors.primary }]}
              onPress={handleAddExercise}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addExerciseButtonText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {exercises.length === 0 ? (
            <View style={styles.emptyExercises}>
              <Ionicons name="fitness-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyExercisesText, { color: colors.textSecondary }]}>
                Nenhum exercício adicionado
              </Text>
              <Text style={[styles.emptyExercisesSubtext, { color: colors.textMuted }]}>
                Adicione exercícios para compor o protocolo
              </Text>
            </View>
          ) : (
            <View style={styles.exercisesList}>
              {exercises.map((exercise, index) => (
                <View
                  key={index}
                  style={[styles.exerciseItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                >
                  <View style={styles.exerciseOrder}>
                    <Text style={[styles.exerciseOrderText, { color: colors.textMuted }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={[styles.exerciseName, { color: colors.text }]}>
                      {exercise.name || `Exercício ${index + 1}`}
                    </Text>
                    <Text style={[styles.exerciseDetails, { color: colors.textSecondary }]}>
                      {exercise.sets || 3} séries × {exercise.reps || 12} repetições
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeExerciseButton}
                    onPress={() => handleRemoveExercise(index)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: name && category && exercises.length > 0 ? colors.primary : colors.border },
          ]}
          onPress={handleSave}
          disabled={!name || !category || exercises.length === 0 || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Salvar Alterações' : 'Criar Protocolo'}
              </Text>
            </>
          )}
        </TouchableOpacity>
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
  section: {
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoriesScroll: {
    flexDirection: 'row',
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    flex: 1,
    gap: 2,
  },
  checkboxText: {
    fontSize: 15,
    fontWeight: '500',
  },
  checkboxSubtext: {
    fontSize: 13,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  addExerciseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyExercises: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyExercisesText: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptyExercisesSubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
  exercisesList: {
    gap: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  exerciseOrder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  exerciseOrderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '500',
  },
  exerciseDetails: {
    fontSize: 13,
  },
  removeExerciseButton: {
    padding: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});
