import { useState, useEffect } from 'react';
import {
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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

// Enhanced SOAP Input Field Component
const SOAPInputField = ({ section, value, onChangeText, isFocused, onFocus, onBlur, colors }) => {
    // ... same implementation as before
};
// Pain Level Slider Component
const PainLevelSlider = ({ painLevel, onValueChange, colors }) => {
    // ... same implementation as before
};
// Photo Grid Component
const PhotoGrid = ({ photos, onAddPhoto, onTakePhoto, onRemovePhoto, colors }) => {
    // ... same implementation as before
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
    // ... (same implementation as before, but add isNew: true)
    if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map((asset, index) => ({
          uri: asset.uri,
          id: `photo-${Date.now()}-${index}`,
          isNew: true,
        }));
        setPhotos([...photos, ...newPhotos]);
      }
  };

  const handleTakePhoto = async () => {
    // ... (same implementation as before, but add isNew: true)
    if (!result.canceled && result.assets[0]) {
        const newPhoto = {
          uri: result.assets[0].uri,
          id: `photo-${Date.now()}`,
          isNew: true,
        };
        setPhotos([...photos, newPhoto]);
      }
  };
  
  const handleRemovePhoto = (id: string) => {
    medium();
    setPhotos(photos.filter((p) => p.id !== id));
  };
  
  // ... (rest of the component, including JSX)
  // ... The save button loading state should also check for isUploading
  const isSaving = isCreating || isUpdating || isUploading;
  
  // ... In the save button:
  // disabled={isSaving || !canSave}
  // {isSaving ? <ActivityIndicator ... /> : ... }
}
// ... (styles)
