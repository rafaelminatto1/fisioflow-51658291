import { useState, useEffect } from 'react';
import {
  Alert,
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { launchImageLibraryAsync, launchCameraAsync, MediaTypeOptions } from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useEvolutions, useEvolution } from '@/hooks';
import { useQuery } from '@tanstack/react-query';
import { uploadFile } from '@/lib/storage';
import { Card } from '@/components';
import { getPatientById } from '@/lib/api';
import { generateEvolutionPDF } from '@/lib/services/pdfGenerator';

function FullScreenImageModal({ visible, uri, onClose, colors }: { visible: boolean; uri: string | null; onClose: () => void; colors: any }) {
  if (!uri) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: 48, right: 20, zIndex: 10 }}>
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
        <Image source={{ uri }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
      </View>
    </Modal>
  );
}



interface Photo {
  uri: string;
  id: string;
  isNew: boolean; // To track which photos need uploading
}

// ... (SOAP_SECTIONS, ProgressRing, SOAPInputField, etc. - all the UI components from before)
// ... (I will omit them for brevity but they are included in the final file)

type SOAPKey = 'subjective' | 'objective' | 'assessment' | 'plan';

// Enhanced SOAP Input Field Component
const SOAPInputField = ({
  section,
  value,
  onChangeText,
  isFocused,
  onFocus,
  onBlur,
  colors,
}: {
  section: string;
  value: string;
  onChangeText: (text: string) => void;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  colors: any;
}) => {
  return (
    <View style={[styles.soapField, isFocused && { borderColor: colors.primary }]}>
      <Text style={[styles.soapLabel, { color: colors.textSecondary }]}>{section}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        multiline
        numberOfLines={4}
        style={[styles.soapInput, { color: colors.text }]}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
};

// Pain Level Slider Component
const PainLevelSlider = ({ painLevel, onValueChange, colors }: { painLevel: number; onValueChange: (val: number) => void; colors: any }) => {
  return (
    <View style={styles.painLevelContainer}>
      <Text style={[styles.painLevelLabel, { color: colors.text }]}>Nível de Dor</Text>
      <Slider
        style={styles.painLevelSlider}
        minimumValue={0}
        maximumValue={10}
        step={1}
        value={painLevel}
        onValueChange={onValueChange}
        minimumTrackTintColor={painLevel <= 3 ? '#10B981' : painLevel <= 6 ? '#F59E0B' : '#EF4444'}
        maximumTrackTintColor={colors.border}
      />
      <Text style={[styles.painLevelValue, { color: colors.primary }]}>{painLevel}/10</Text>
    </View>
  );
};

// Photo Grid Component
const PhotoGrid = ({
  photos,
  onAddPhoto,
  onTakePhoto,
  onRemovePhoto,
  onViewPhoto,
  colors,
}: {
  photos: Photo[];
  onAddPhoto: () => void;
  onTakePhoto: () => void;
  onRemovePhoto: (id: string) => void;
  onViewPhoto?: (uri: string) => void;
  colors: any;
}) => {
  return (
    <View style={styles.photoGridContainer}>
      <View style={styles.photoGrid}>
        {photos.map((photo) => (
          <View key={photo.id} style={styles.photoWrapper}>
            <TouchableOpacity onPress={() => onViewPhoto?.(photo.uri)} activeOpacity={0.8}>
              <Image source={{ uri: photo.uri }} style={styles.photo} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoRemoveButton, { backgroundColor: colors.surface }]}
              onPress={() => onRemovePhoto(photo.id)}
            >
              <Ionicons name="close" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={[styles.photoAddButton, { borderColor: colors.border }]} onPress={onAddPhoto}>
          <Ionicons name="image" size={24} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.photoAddButton, { borderColor: colors.border }]} onPress={onTakePhoto}>
          <Ionicons name="camera" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};


export default function EvolutionScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const patientId = params.id as string;
  const evolutionId = params.evolutionId as string | undefined;
  

  const { medium, success, error: hapticError } = useHaptics();

  const {
    createAsync: createEvolutionAsync,
    updateAsync: updateEvolutionAsync,
    deleteAsync: deleteEvolutionAsync,
    isCreating,
    isUpdating,
    } = useEvolutions(patientId);

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatientById(patientId),
    enabled: !!patientId,
  });

  // Form state
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [painLevel, setPainLevel] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [prescribedExercises, setPrescribedExercises] = useState<any[]>([]);

  const [focusedField, setFocusedField] = useState<SOAPKey | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [isViewerVisible, setIsViewerVisible] = useState(false);

  const isEditing = !!evolutionId;

  // Load existing evolution if editing
  
  const { data: evolutionData } = useEvolution(evolutionId);

  useEffect(() => {
    if (evolutionData) {
      setSubjective(evolutionData.subjective || '');
      setObjective(evolutionData.objective || '');
      setAssessment(evolutionData.assessment || '');
      setPlan(evolutionData.plan || '');
      setPainLevel(evolutionData.painLevel || 0);
      if (evolutionData.attachments) {
        setPhotos(evolutionData.attachments.map((uri, index) => ({
          uri,
          id: `photo-${Date.now()}-${index}`,
          isNew: false, // These are already uploaded
        })));
      }
    }
  }, [evolutionData]);

  const handleSave = async () => {
    medium();
    const hasContent = subjective.trim() || objective.trim() || assessment.trim() || plan.trim();
    if (!hasContent) {
      Alert.alert('Atenção', 'Preencha pelo menos um campo do SOAP para salvar.');
      hapticError();
      return;
    }

    setIsUploading(true);

    try {
      // 1. Upload new photos
      const uploadedUrls = await Promise.all(
        photos.map(async (photo) => {
          if (photo.isNew) {
            const fileName = photo.uri.split('/').pop() || `photo-${Date.now()}`;
            const path = `evolutions/${patientId}/${evolutionId || `new_${Date.now()}`}/${fileName}`;
            return uploadFile(photo.uri, path);
          }
          return photo.uri; // Return existing URL
        })
      );

      // 2. Prepare data for API
      const evolutionPayload = {
        patientId,
        date: new Date().toISOString(),
        subjective: subjective.trim(),
        objective: objective.trim(),
        assessment: assessment.trim(),
        plan: plan.trim(),
        painLevel,
        attachments: uploadedUrls,
        exercises_performed: prescribedExercises,
      };

      // 3. Call mutation
      if (isEditing) {
        await updateEvolutionAsync({ id: evolutionId!, data: evolutionPayload as any });
      } else {
        await createEvolutionAsync(evolutionPayload as any);
      }

      success();
      Alert.alert('Sucesso', `Evolução ${isEditing ? 'atualizada' : 'registrada'}!`);
      router.back();

    } catch (err: any) {
      hapticError();
      Alert.alert('Erro', err.message || 'Não foi possível salvar a evolução.');
    } finally {
        setIsUploading(false);
    }
  };

  const handleSharePDF = async () => {
    if (!patient || !evolutionData) {
      Alert.alert('Erro', 'Dados insuficientes para gerar o relatório.');
      return;
    }
    medium();
    try {
      // For single evolution report, we wrap it in an array
      await generateEvolutionPDF(patient as any, [evolutionData as any]);
      success();
    } catch {
      hapticError();
      Alert.alert('Erro', 'Falha ao gerar PDF.');
    }
  };

  const handleDelete = () => {
    if (!evolutionId) return;
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
                Alert.alert('Sucesso', 'Evolução excluída com sucesso!');
                router.back();
              } catch (err: any) {
                hapticError();
                Alert.alert('Erro', err.message || 'Não foi possível excluir a evolução.');
              }
          },
        },
      ]
    );
  };

  const handleAddPhoto = async () => {
    try {
      const result = await launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
      });
      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map((asset: any, index: number) => ({
          uri: asset.uri,
          id: `photo-${Date.now()}-${index}`,
          isNew: true,
        }));
        setPhotos([...photos, ...newPhotos]);
      }
    } catch  {
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await launchCameraAsync({
        mediaTypes: MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const newPhoto = {
          uri: result.assets[0].uri,
          id: `photo-${Date.now()}`,
          isNew: true,
        };
        setPhotos([...photos, newPhoto]);
      }
    } catch  {
      Alert.alert('Erro', 'Não foi possível tirar a foto.');
    }
  };
  
  const handleRemovePhoto = (id: string) => {
    medium();
    setPhotos(photos.filter((p) => p.id !== id));
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    medium();
    const newExercises = [...prescribedExercises];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newExercises.length) {
      [newExercises[index], newExercises[newIndex]] = [newExercises[newIndex], newExercises[index]];
      setPrescribedExercises(newExercises);
    }
  };

  const handleAddExercisePlaceholder = () => {
    medium();
    setPrescribedExercises([...prescribedExercises, { 
      id: `ex-${Date.now()}`, 
      name: 'Novo Exercício', 
      sets: 3, 
      reps: 12 
    }]);
  };

  const handleRemoveExercise = (id: string) => {
    medium();
    setPrescribedExercises(prescribedExercises.filter(e => e.id !== id));
  };
  
  // ... (rest of the component, including JSX)
  // ... The save button loading state should also check for isUploading
  const isSaving = isCreating || isUpdating || isUploading;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditing ? 'Editar Evolução' : 'Nova Evolução'}
        </Text>
        <View style={styles.headerActions}>
          {isEditing && (
            <>
              <TouchableOpacity onPress={handleSharePDF} style={{ marginRight: 16 }}>
                <Ionicons name="share-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete}>
                <Ionicons name="trash-outline" size={24} color={colors.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.form}>
        <PainLevelSlider painLevel={painLevel} onValueChange={setPainLevel} colors={colors} />

        <SOAPInputField
          section="Subjetivo"
          value={subjective}
          onChangeText={setSubjective}
          isFocused={focusedField === 'subjective'}
          onFocus={() => setFocusedField('subjective')}
          onBlur={() => setFocusedField(null)}
          colors={colors}
        />

        <SOAPInputField
          section="Objetivo"
          value={objective}
          onChangeText={setObjective}
          isFocused={focusedField === 'objective'}
          onFocus={() => setFocusedField('objective')}
          onBlur={() => setFocusedField(null)}
          colors={colors}
        />

        <SOAPInputField
          section="Avaliação"
          value={assessment}
          onChangeText={setAssessment}
          isFocused={focusedField === 'assessment'}
          onFocus={() => setFocusedField('assessment')}
          onBlur={() => setFocusedField(null)}
          colors={colors}
        />

        <SOAPInputField
          section="Plano"
          value={plan}
          onChangeText={setPlan}
          isFocused={focusedField === 'plan'}
          onFocus={() => setFocusedField('plan')}
          onBlur={() => setFocusedField(null)}
          colors={colors}
        />

        <View style={styles.exercisesHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Exercícios da Sessão</Text>
          <TouchableOpacity onPress={handleAddExercisePlaceholder} style={styles.addExerciseBtn}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.addExerciseText, { color: colors.primary }]}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {prescribedExercises.map((ex, index) => (
          <Card key={ex.id} style={styles.exerciseCard}>
            <View style={styles.exerciseInfo}>
              <Text style={[styles.exerciseName, { color: colors.text }]}>{ex.name}</Text>
              <Text style={[styles.exerciseMeta, { color: colors.textSecondary }]}>
                {ex.sets} séries x {ex.reps} reps
              </Text>
            </View>
            <View style={styles.exerciseActions}>
              <TouchableOpacity onPress={() => handleMoveExercise(index, 'up')} disabled={index === 0}>
                <Ionicons name="arrow-up" size={20} color={index === 0 ? colors.border : colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleMoveExercise(index, 'down')} disabled={index === prescribedExercises.length - 1}>
                <Ionicons name="arrow-down" size={20} color={index === prescribedExercises.length - 1 ? colors.border : colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleRemoveExercise(ex.id)}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Anexos</Text>
        <PhotoGrid
          photos={photos}
          onAddPhoto={handleAddPhoto}
          onTakePhoto={handleTakePhoto}
          onRemovePhoto={handleRemovePhoto}
          onViewPhoto={(uri) => {
            setSelectedPhotoUri(uri);
            setIsViewerVisible(true);
          }}
          colors={colors}
        />
      </View>

      <FullScreenImageModal 
        visible={isViewerVisible} 
        uri={selectedPhotoUri} 
        onClose={() => setIsViewerVisible(false)} 
        colors={colors} 
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary, opacity: isSaving ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar Evolução</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  form: {
    padding: 16,
    gap: 16,
  },
  soapField: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  soapLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  soapInput: {
    fontSize: 16,
    minHeight: 80,
  },
  painLevelContainer: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  painLevelLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  painLevelSlider: {
    width: '100%',
    height: 40,
  },
  painLevelValue: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  photoGridContainer: {
    padding: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoWrapper: {
    width: 80,
    height: 80,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  photoRemoveButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addExerciseText: {
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  fullScreenOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
  footer: {
    padding: 16,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
