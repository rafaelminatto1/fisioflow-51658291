import { useState, useEffect } from 'react';
import {
  Alert,
  Dimensions,
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
import { uploadFile } from '@/lib/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  colors,
}: {
  photos: Photo[];
  onAddPhoto: () => void;
  onTakePhoto: () => void;
  onRemovePhoto: (id: string) => void;
  colors: any;
}) => {
  return (
    <View style={styles.photoGridContainer}>
      <View style={styles.photoGrid}>
        {photos.map((photo) => (
          <View key={photo.id} style={styles.photoWrapper}>
            <Image source={{ uri: photo.uri }} style={styles.photo} />
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
  const patientName = params.patientName as string || 'Paciente';

  const { medium, success, error: hapticError } = useHaptics();
  
  const { 
    createAsync: createEvolutionAsync, 
    updateAsync: updateEvolutionAsync, 
    deleteAsync: deleteEvolutionAsync,
    isCreating,
    isUpdating,
    isDeleting,
  } = useEvolutions(patientId);

  // Form state
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [painLevel, setPainLevel] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);

  const [focusedField, setFocusedField] = useState<SOAPKey | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const isEditing = !!evolutionId;

  // Load existing evolution if editing
  const { isLoading: isLoadingEvolution } = useEvolution(evolutionId);
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
    } catch (err) {
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
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível tirar a foto.');
    }
  };
  
  const handleRemovePhoto = (id: string) => {
    medium();
    setPhotos(photos.filter((p) => p.id !== id));
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
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={24} color={colors.error} />
            </TouchableOpacity>
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

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Anexos</Text>
        <PhotoGrid
          photos={photos}
          onAddPhoto={handleAddPhoto}
          onTakePhoto={handleTakePhoto}
          onRemovePhoto={handleRemovePhoto}
          colors={colors}
        />
      </View>

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
