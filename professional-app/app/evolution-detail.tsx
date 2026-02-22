import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useEvolutions, useEvolution } from '@/hooks';
import { SOAPForm } from '@/components/evolution/SOAPForm';
import { PainLevelSlider } from '@/components/evolution/PainLevelSlider';
import { PhotoUpload } from '@/components/evolution/PhotoUpload';

export default function EvolutionDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const evolutionId = params.evolutionId as string;
  const patientId = params.patientId as string;
  const patientName = params.patientName as string || 'Paciente';

  const { medium, success, error: hapticError } = useHaptics();
  
  const { data: evolution, isLoading } = useEvolution(evolutionId);
  const { 
    updateAsync: updateEvolutionAsync,
    deleteAsync: deleteEvolutionAsync,
    isUpdating,
    isDeleting,
  } = useEvolutions(patientId);

  const [isEditing, setIsEditing] = useState(false);
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [painLevel, setPainLevel] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (evolution) {
      setSubjective(evolution.subjective || '');
      setObjective(evolution.objective || '');
      setAssessment(evolution.assessment || '');
      setPlan(evolution.plan || '');
      setPainLevel(evolution.painLevel || 0);
      setPhotos(evolution.attachments || []);
    }
  }, [evolution]);

  const handleSave = async () => {
    medium();
    
    const hasContent = subjective.trim() || objective.trim() || assessment.trim() || plan.trim();
    if (!hasContent) {
      Alert.alert('Atenção', 'Preencha pelo menos um campo do SOAP para salvar.');
      hapticError();
      return;
    }

    try {
      await updateEvolutionAsync({
        id: evolutionId,
        data: {
          subjective: subjective.trim(),
          objective: objective.trim(),
          assessment: assessment.trim(),
          plan: plan.trim(),
          painLevel,
          attachments: photos,
        } as any,
      });

      success();
      setIsEditing(false);
      Alert.alert('Sucesso', 'Evolução atualizada com sucesso!');
    } catch (err: any) {
      hapticError();
      Alert.alert('Erro', err.message || 'Não foi possível atualizar a evolução.');
    }
  };

  const handleDelete = () => {
    medium();
    Alert.alert(
      'Excluir Evolução',
      'Tem certeza que deseja excluir esta evolução? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvolutionAsync(evolutionId);
              success();
              Alert.alert('Sucesso', 'Evolução excluída com sucesso!', [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            } catch (err: any) {
              hapticError();
              Alert.alert('Erro', err.message || 'Não foi possível excluir a evolução.');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!evolution) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Evolução não encontrada</Text>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Voltar</Text>
          </TouchableOpacity>
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
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? 'Editar Evolução' : 'Detalhes da Evolução'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{patientName}</Text>
        </View>
        {!isEditing && (
          <TouchableOpacity
            onPress={() => {
              medium();
              setIsEditing(true);
            }}
            style={styles.editButton}
          >
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
        {isEditing && <View style={styles.placeholder} />}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Date */}
        <View style={[styles.dateCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {evolution.date ? format(new Date(evolution.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Data não disponível'}
          </Text>
        </View>

        {isEditing ? (
          <>
            {/* SOAP Form */}
            <SOAPForm
              subjective={subjective}
              objective={objective}
              assessment={assessment}
              plan={plan}
              onChangeSubjective={setSubjective}
              onChangeObjective={setObjective}
              onChangeAssessment={setAssessment}
              onChangePlan={setPlan}
              colors={colors}
            />

            {/* Pain Level */}
            <PainLevelSlider
              painLevel={painLevel}
              onValueChange={setPainLevel}
              colors={colors}
            />

            {/* Photo Upload */}
            <PhotoUpload
              photos={photos}
              onPhotosChange={setPhotos}
              colors={colors}
            />

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  medium();
                  setIsEditing(false);
                  // Reset to original values
                  if (evolution) {
                    setSubjective(evolution.subjective || '');
                    setObjective(evolution.objective || '');
                    setAssessment(evolution.assessment || '');
                    setPlan(evolution.plan || '');
                    setPainLevel(evolution.painLevel || 0);
                    setPhotos(evolution.attachments || []);
                  }
                }}
                disabled={isUpdating}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: colors.error }]}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.deleteButtonText}>Excluir Evolução</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* View Mode */}
            {evolution.subjective && (
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>Subjetivo (S)</Text>
                </View>
                <Text style={[styles.sectionText, { color: colors.text }]}>{evolution.subjective}</Text>
              </View>
            )}

            {evolution.objective && (
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="eye-outline" size={20} color={colors.primary} />
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>Objetivo (O)</Text>
                </View>
                <Text style={[styles.sectionText, { color: colors.text }]}>{evolution.objective}</Text>
              </View>
            )}

            {evolution.assessment && (
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="analytics-outline" size={20} color={colors.primary} />
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>Avaliação (A)</Text>
                </View>
                <Text style={[styles.sectionText, { color: colors.text }]}>{evolution.assessment}</Text>
              </View>
            )}

            {evolution.plan && (
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>Plano (P)</Text>
                </View>
                <Text style={[styles.sectionText, { color: colors.text }]}>{evolution.plan}</Text>
              </View>
            )}

            {evolution.painLevel !== undefined && (
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Nível de Dor</Text>
                <View style={styles.painDisplay}>
                  <Text style={[styles.painValue, { color: colors.primary }]}>{evolution.painLevel}</Text>
                  <Text style={[styles.painScale, { color: colors.textSecondary }]}>/ 10</Text>
                </View>
              </View>
            )}

            {evolution.attachments && evolution.attachments.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="images-outline" size={20} color={colors.primary} />
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>Fotos ({evolution.attachments.length})</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photosContainer}
                >
                  {evolution.attachments.map((photo, index) => (
                    <Image
                      key={index}
                      source={{ uri: photo }}
                      style={styles.photoPreview}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  editButton: {
    padding: 8,
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
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  painDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 8,
  },
  painValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  painScale: {
    fontSize: 24,
  },
  photosContainer: {
    gap: 12,
    paddingVertical: 8,
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  actions: {
    gap: 12,
    marginTop: 8,
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
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    padding: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
