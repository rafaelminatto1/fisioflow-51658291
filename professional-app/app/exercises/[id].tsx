import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getExerciseById } from '@/lib/api';
import { useColors } from '@/hooks/useColorScheme';
import { Button } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colors = useColors();
  const { medium } = useHaptics();

  const { data: exercise, isLoading, error } = useQuery({
    queryKey: ['exercise', id],
    queryFn: () => getExerciseById(id as string),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !exercise) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.text }}>Exercício não encontrado.</Text>
        <Button title="Voltar" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{exercise.name}</Text>
        <TouchableOpacity onPress={() => {
            medium();
            router.push(`/exercise-form?id=${id}`);
        }}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView>
        {exercise.imageUrl && (
          <Image source={{ uri: exercise.imageUrl }} style={styles.image} />
        )}
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{exercise.name}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{exercise.description}</Text>
          
          <View style={styles.metaContainer}>
            <View style={[styles.metaTag, { backgroundColor: colors.surface }]}>
                <Text style={styles.metaText}>Categoria: {exercise.category}</Text>
            </View>
            <View style={[styles.metaTag, { backgroundColor: colors.surface }]}>
                <Text style={styles.metaText}>Dificuldade: {exercise.difficulty}</Text>
            </View>
          </View>

          {exercise.instructions && exercise.instructions.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Instruções</Text>
              {exercise.instructions.map((inst, index) => (
                <Text key={index} style={[styles.instruction, { color: colors.textSecondary }]}>
                  {`\u2022 ${inst}`}
                </Text>
              ))}
            </View>
          )}

          {exercise.videoUrl && (
            <View style={styles.section}>
                <Button 
                    title="Assistir Vídeo" 
                    onPress={() => Alert.alert("Abrir vídeo", "Funcionalidade de abrir vídeo não implementada.")} 
                    leftIcon="logo-youtube"
                />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    flex: 1,
    marginHorizontal: 16,
    textAlign: 'center',
  },
  image: {
    width: '100%',
    height: 250,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metaTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instruction: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 4,
  },
});
