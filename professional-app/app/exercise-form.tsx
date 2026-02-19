import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { Button, Input, Picker } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useQuery } from '@tanstack/react-query';
import { useExerciseCreate, useExerciseUpdate, useExerciseDelete } from '@/hooks/useExercises';
import { getExerciseById } from '@/lib/api';
import type { Exercise } from '@/types';

const CATEGORIES = ['Alongamento', 'Fortalecimento', 'Mobilidade', 'Equilíbrio', 'Cardio', 'Respiratório', 'Pós-operatório', 'Outro'];
const DIFFICULTIES = [
    { label: 'Fácil', value: 'easy' },
    { label: 'Médio', value: 'medium' },
    { label: 'Difícil', value: 'hard' },
];

export default function ExerciseFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { medium, success, error } = useHaptics();

  const exerciseId = params.id as string | undefined;
  const isEditing = !!exerciseId;

  const { createExerciseAsync, isCreating } = useExerciseCreate();
  const { updateExerciseAsync, isUpdating } = useExerciseUpdate();
  const { deleteExerciseAsync, isDeleting } = useExerciseDelete();

  const [formData, setFormData] = useState<Partial<Exercise>>({
    name: '',
    description: '',
    category: 'Fortalecimento',
    difficulty: 'medium',
    instructions: [],
    videoUrl: '',
    imageUrl: '',
  });

  // Fetch exercise data for editing
  const { data: exercise, isLoading: isLoadingExercise } = useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: async () => {
        if (!exerciseId) return null;
        const result = await getExerciseById(exerciseId);
        // The API returns ApiExercise, need to map it if mapApiExercise is not exported
        // For now, let's assume it returns data compatible with the form
        return result;
    },
    enabled: !!exerciseId,
  });

  useEffect(() => {
    if (exercise) {
      setFormData({
        name: exercise.name || '',
        description: exercise.description || '',
        category: exercise.category || 'Geral',
        difficulty: exercise.difficulty || 'medium',
        instructions: exercise.instructions || [],
        videoUrl: exercise.videoUrl || '',
        imageUrl: exercise.imageUrl || '',
      });
    }
  }, [exercise]);

  const handleSave = async () => {
    medium();
    if (!formData.name) {
      Alert.alert('Erro', 'O nome do exercício é obrigatório.');
      error();
      return;
    }

    try {
      if (isEditing && exerciseId) {
        await updateExerciseAsync({ id: exerciseId, data: formData });
        success();
        Alert.alert('Sucesso', 'Exercício atualizado com sucesso!');
      } else {
        await createExerciseAsync(formData as Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>);
        success();
        Alert.alert('Sucesso', 'Exercício criado com sucesso!');
      }
      router.back();
    } catch (err: any) {
      error();
      Alert.alert('Erro', err.message || 'Não foi possível salvar o exercício.');
    }
  };
  
  const handleDelete = () => {
    if (!exerciseId) return;
    medium();
    Alert.alert(
      'Excluir Exercício',
      'Tem certeza que deseja excluir este exercício da biblioteca? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExerciseAsync(exerciseId);
              success();
              Alert.alert('Sucesso', 'Exercício excluído com sucesso.');
              router.replace('/exercises'); 
            } catch (err: any) {
              error();
              Alert.alert('Erro', err.message || 'Não foi possível excluir o exercício.');
            }
          },
        },
      ]
    );
  };

  const updateField = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  if (isLoadingExercise) {
    return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? 'Editar Exercício' : 'Novo Exercício'}
          </Text>
          {isEditing ? (
            <TouchableOpacity onPress={handleDelete} disabled={isDeleting}>
              <Ionicons name="trash-outline" size={24} color={colors.error} />
            </TouchableOpacity>
          ) : <View style={{width: 24}} />}
        </View>

        <ScrollView style={styles.form}>
          <Input
            label="Nome do Exercício"
            value={formData.name}
            onChangeText={(v) => updateField('name', v)}
            placeholder="Ex: Agachamento com Peso"
          />
          <Input
            label="Descrição"
            value={formData.description}
            onChangeText={(v) => updateField('description', v)}
            placeholder="Breve descrição do objetivo do exercício"
            multiline
          />
          <Picker
            label="Categoria"
            selectedValue={formData.category}
            onValueChange={(v) => updateField('category', v)}
            items={CATEGORIES.map(c => ({ label: c, value: c }))}
           />
          <Picker
            label="Dificuldade"
            selectedValue={formData.difficulty}
            onValueChange={(v) => updateField('difficulty', v)}
            items={DIFFICULTIES}
          />
          <Input
            label="URL da Imagem"
            value={formData.imageUrl}
            onChangeText={(v) => updateField('imageUrl', v)}
            placeholder="https://exemplo.com/imagem.png"
            keyboardType="url"
          />
          <Input
            label="URL do Vídeo (YouTube, Vimeo, etc.)"
            value={formData.videoUrl}
            onChangeText={(v) => updateField('videoUrl', v)}
            placeholder="https://youtube.com/watch?v=..."
            keyboardType="url"
          />
          
          <Button
            title={isEditing ? 'Salvar Alterações' : 'Criar Exercício'}
            onPress={handleSave}
            loading={isCreating || isUpdating}
            style={{ marginTop: 24 }}
          />
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  form: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
});
