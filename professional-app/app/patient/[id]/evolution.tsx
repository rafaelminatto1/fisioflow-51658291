import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { Slider } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useQuery } from '@tanstack/react-query';
import { useEvolutions } from '@/hooks';
import { getEvolutionById } from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Photo {
  uri: string;
  id: string;
}

// SOAP sections configuration with enhanced styling
const SOAP_SECTIONS = {
  subjective: {
    letter: 'S',
    label: 'Subjetivo',
    placeholder: 'O que o paciente relatou? Queixas, sintomas, sensações...',
    description: 'Relato do paciente sobre seus sintomas',
    icon: 'chatbubbles',
    gradient: ['#3B82F6', '#2563EB'], // Blue gradient
    color: '#3B82F6',
    lightColor: '#DBEAFE',
  },
  objective: {
    letter: 'O',
    label: 'Objetivo',
    placeholder: 'Dados mensuráveis: ADM, força muscular, edema, postura...',
    description: 'Achados clínicos e exame físico',
    icon: 'eye',
    gradient: ['#10B981', '#059669'], // Green gradient
    color: '#10B981',
    lightColor: '#D1FAE5',
  },
  assessment: {
    letter: 'A',
    label: 'Avaliação',
    placeholder: 'Sua interpretação: diagnóstico funcional, progresso, prognóstico...',
    description: 'Análise clínica do profissional',
    icon: 'brain',
    gradient: ['#F59E0B', '#D97706'], // Orange/amber gradient
    color: '#F59E0B',
    lightColor: '#FEF3C7',
  },
  plan: {
    letter: 'P',
    label: 'Plano',
    placeholder: 'Próximos passos: conduta, exercícios, orientações, retornos...',
    description: 'Intervenções planejadas',
    icon: 'list',
    gradient: ['#8B5CF6', '#7C3AED'], // Purple gradient
    color: '#8B5CF6',
    lightColor: '#EDE9FE',
  },
} as const;

type SOAPKey = keyof typeof SOAP_SECTIONS;

// Animated progress indicator component
const ProgressRing = ({ progress, size = 60, strokeWidth = 6 }: { progress: number; size?: number; strokeWidth?: number }) => {
  const colors = useColors();
  const radius = (size - strokeWidth) / 2;

  return (
    <View style={[styles.progressRingContainer, { width: size, height: size }]}>
      {/* Background circle */}
      <View
        style={[
          styles.progressRingBg,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: colors.border,
          },
        ]}
      />
      {/* Progress circle using absolute positioning */}
      <View
        style={[
          styles.progressRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: colors.primary,
            borderRightColor: 'transparent',
            borderBottomColor: 'transparent',
            transform: [{ rotate: `${-90 + (progress * 3.6)}deg` }],
          },
        ]}
      />
      <View style={styles.progressRingContent}>
        <Text style={[styles.progressText, { color: colors.text }]}>{Math.round(progress)}%</Text>
      </View>
    </View>
  );
};

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
  section: typeof SOAP_SECTIONS[SOAPKey];
  value: string;
  onChangeText: (text: string) => void;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  colors: ReturnType<typeof useColors>;
}) => {
  const animatedBorder = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedBorder, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, animatedBorder]);

  const borderColor = animatedBorder.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, section.color],
  });

  const hasContent = value.trim().length > 0;

  return (
    <View style={styles.soapFieldContainer}>
      {/* Enhanced header with letter badge */}
      <View style={styles.soapFieldHeader}>
        <View style={[styles.soapLetterBadge, { backgroundColor: section.color }]}>
          <Text style={styles.soapLetterText}>{section.letter}</Text>
        </View>
        <View style={styles.soapFieldHeaderInfo}>
          <Text style={[styles.soapFieldLabel, { color: colors.text }]}>{section.label}</Text>
          <Text style={[styles.soapFieldDescription, { color: colors.textSecondary }]}>
            {section.description}
          </Text>
        </View>
        {hasContent && (
          <View style={[styles.completionIndicator, { backgroundColor: section.lightColor }]}>
            <Ionicons name="checkmark-circle" size={16} color={section.color} />
          </View>
        )}
      </View>

      {/* Enhanced input with animated border */}
      <Animated.View
        style={[
          styles.soapInputWrapper,
          {
            backgroundColor: colors.surface,
            borderColor,
          },
        ]}
      >
        <TextInput
          style={[styles.soapInput, { color: colors.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={section.placeholder}
          placeholderTextColor={colors.textMuted}
          multiline
          onFocus={onFocus}
          onBlur={onBlur}
          textAlignVertical="top"
          autoFocus={false}
        />

        {/* Character count */}
        <View style={styles.inputFooter}>
          <Text style={[styles.charCount, { color: colors.textMuted }]}>
            {value.length} caracteres
          </Text>
          {value.length > 0 && (
            <TouchableOpacity onPress={() => onChangeText('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

// Pain Level Slider Component
const PainLevelSlider = ({
  painLevel,
  onValueChange,
  colors,
}: {
  painLevel: number;
  onValueChange: (value: number) => void;
  colors: ReturnType<typeof useColors>;
}) => {
  const getPainColor = (level: number) => {
    if (level === 0) return colors.success;
    if (level <= 3) return colors.success;
    if (level <= 6) return colors.warning;
    return colors.error;
  };

  const getPainEmoji = (level: number) => {
    if (level === 0) return '😊';
    if (level <= 2) return '🙂';
    if (level <= 4) return '😐';
    if (level <= 6) return '😟';
    if (level <= 8) return '😣';
    return '😫';
  };

  const painColor = getPainColor(painLevel);

  return (
    <View style={[styles.painContainer, { backgroundColor: colors.surface }]}>
      <View style={styles.painHeader}>
        <Ionicons name="pulse" size={22} color={colors.primary} />
        <Text style={[styles.painTitle, { color: colors.text }]}>Nível de Dor (EVA)</Text>
      </View>

      <View style={styles.painDisplay}>
        {/* Pain emoji */}
        <View style={[styles.painEmojiContainer, { backgroundColor: `${painColor}15` }]}>
          <Text style={styles.painEmoji}>{getPainEmoji(painLevel)}</Text>
        </View>

        {/* Pain value */}
        <View style={styles.painValueSection}>
          <View style={[styles.painValueBadge, { backgroundColor: painColor }]}>
            <Text style={styles.painValueText}>{painLevel}</Text>
          </View>
          <Text style={[styles.painValueLabel, { color: colors.textSecondary }]}>/ 10</Text>
        </View>
      </View>

      {/* Pain description */}
      <View style={[styles.painDescriptionCard, { backgroundColor: `${painColor}10` }]}>
        <Text style={[styles.painDescription, { color: painColor }]}>
          {painLevel === 0 && 'Sem dor - Paciente sem queixas dolorosas'}
          {painLevel >= 1 && painLevel <= 3 && 'Dor leve - Paciente consegue realizar atividades normalmente'}
          {painLevel >= 4 && painLevel <= 6 && 'Dor moderada - Paciente sente desconforto mas consegue continuar'}
          {painLevel >= 7 && 'Dor intensa - Paciente precisa interromper atividades'}
        </Text>
      </View>

      {/* Slider */}
      <Slider
        minValue={0}
        maxValue={10}
        step={1}
        value={painLevel}
        onValueChange={onValueChange}
        marks={[
          { value: 0, label: '0' },
          { value: 2, label: '2' },
          { value: 4, label: '4' },
          { value: 6, label: '6' },
          { value: 8, label: '8' },
          { value: 10, label: '10' }
        ]}
      />
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
  colors: ReturnType<typeof useColors>;
}) => {
  return (
    <View style={[styles.photoContainer, { backgroundColor: colors.surface }]}>
      <View style={styles.photoHeader}>
        <Ionicons name="images" size={22} color={colors.primary} />
        <Text style={[styles.photoTitle, { color: colors.text }]}>Fotos e Anexos</Text>
        <View style={[styles.photoCountBadge, { backgroundColor: `${colors.primary}20` }]}>
          <Text style={[styles.photoCountText, { color: colors.primary }]}>{photos.length}/5</Text>
        </View>
      </View>

      {photos.length === 0 ? (
        <View style={styles.emptyPhotoState}>
          <TouchableOpacity
            style={[styles.emptyPhotoButton, { borderColor: colors.border }]}
            onPress={onAddPhoto}
            activeOpacity={0.7}
          >
            <View style={[styles.emptyPhotoIcon, { backgroundColor: `${colors.primary}10` }]}>
              <Ionicons name="camera-outline" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyPhotoText, { color: colors.text }]}>
              Adicionar Fotos
            </Text>
            <Text style={[styles.emptyPhotoSubtext, { color: colors.textSecondary }]}>
              Toque para selecionar da galeria ou tirar uma foto
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.photosGrid}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoItem}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                <TouchableOpacity
                  style={[styles.removePhotoBtn, { backgroundColor: colors.error }]}
                  onPress={() => onRemovePhoto(photo.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity
                style={[styles.addPhotoBtn, { borderColor: colors.border }]}
                onPress={onAddPhoto}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={32} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.photoActions}>
            <TouchableOpacity
              style={[styles.photoActionBtn, { backgroundColor: colors.primary }]}
              onPress={onAddPhoto}
              activeOpacity={0.8}
            >
              <Ionicons name="images" size={18} color="#FFFFFF" />
              <Text style={styles.photoActionText}>Galeria</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoActionBtn, { backgroundColor: colors.info }]}
              onPress={onTakePhoto}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={18} color="#FFFFFF" />
              <Text style={styles.photoActionText}>Câmera</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
  
  // Use the new API-based hooks
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

  // Focus state
  const [focusedField, setFocusedField] = useState<SOAPKey | null>(null);

  const isEditing = !!evolutionId;

  // Load existing evolution if editing
  const { isLoading: isLoadingEvolution } = useQuery({
    queryKey: ['evolution', evolutionId],
    queryFn: async () => {
        if (!evolutionId) return null;
        return getEvolutionById(evolutionId); 
    },
    enabled: isEditing,
    onSuccess: (data) => {
      if (data) {
        setSubjective(data.subjective || '');
        setObjective(data.objective || '');
        setAssessment(data.assessment || '');
        setPlan(data.plan || '');
        // Pain level and attachments are not in the new API table yet.
        // This will need to be added to the schema and API later.
        // setPainLevel(data.painLevel || 0); 
        // setPhotos(data.attachments || []);
      }
    }
  });

  const handleSave = async () => {
    medium();

    const hasContent = subjective.trim() || objective.trim() || assessment.trim() || plan.trim();
    if (!hasContent) {
      Alert.alert('Atenção', 'Preencha pelo menos um campo do SOAP');
      hapticError();
      return;
    }

    try {
      const evolutionData = {
        patientId,
        date: new Date().toISOString(),
        subjective: subjective.trim(),
        objective: objective.trim(),
        assessment: assessment.trim(),
        plan: plan.trim(),
      };

      if (isEditing) {
        await updateEvolutionAsync({ id: evolutionId!, data: evolutionData as any });
        success();
        Alert.alert('Sucesso', 'Evolução atualizada com sucesso!');
      } else {
        await createEvolutionAsync(evolutionData as any);
        success();
        Alert.alert('Sucesso', 'Evolução registrada com sucesso!');
      }
      router.back();
    } catch (err: any) {
      hapticError();
      Alert.alert('Erro', err.message || 'Não foi possível salvar a evolução.');
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
    medium();
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para adicionar fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        const remainingSlots = 5 - photos.length;
        const assetsToAdd = result.assets.slice(0, remainingSlots);
        const newPhotos = assetsToAdd.map((asset, index) => ({
          uri: asset.uri,
          id: `photo-${Date.now()}-${index}`,
        }));
        setPhotos([...photos, ...newPhotos]);
        success();

        if (result.assets.length > remainingSlots) {
          Alert.alert('Aviso', `Apenas ${remainingSlots} foto(s) adicionada(s). Máximo de 5 fotos.`);
        }
      }
    } catch (err) {
      hapticError();
      Alert.alert('Erro', 'Não foi possível adicionar fotos.');
    }
  };

  const handleTakePhoto = async () => {
    medium();
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar fotos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newPhoto = {
          uri: result.assets[0].uri,
          id: `photo-${Date.now()}`,
        };
        setPhotos([...photos, newPhoto]);
        success();
      }
    } catch (err) {
      hapticError();
      Alert.alert('Erro', 'Não foi possível tirar foto.');
    }
  };

  const handleRemovePhoto = (id: string) => {
    medium();
    setPhotos(photos.filter((p) => p.id !== id));
  };

  // Calculate form completion
  const getCompletionPercentage = () => {
    const fields = [subjective, objective, assessment, plan];
    const filledFields = fields.filter(f => f.trim().length > 0).length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const completionPercentage = getCompletionPercentage();
  const canSave = subjective.trim() || objective.trim() || assessment.trim() || plan.trim();

  if (isEditing && isLoadingEvolution) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Enhanced Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {isEditing ? 'Editar Evolução' : 'Nova Evolução'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </Text>
          </View>

          {/* Progress indicator */}
          <View style={styles.headerProgress}>
            <ProgressRing progress={completionPercentage} size={44} strokeWidth={3} />
          </View>
        </View>

        {/* Patient Info Card - Enhanced */}
        <View style={[styles.patientCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.patientAvatar, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="person" size={24} color={colors.primary} />
          </View>
          <View style={styles.patientInfo}>
            <Text style={[styles.patientName, { color: colors.text }]}>{patientName}</Text>
            <Text style={[styles.sessionLabel, { color: colors.textSecondary }]}>
              {isEditing ? 'Sessão editada' : 'Sessão em andamento'}
            </Text>
          </View>
          <View style={styles.sessionStatus}>
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              {isEditing ? 'Atualizando' : 'Em andamento'}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Pain Level Section */}
          <PainLevelSlider painLevel={painLevel} onValueChange={setPainLevel} colors={colors} />

          {/* SOAP Form - Enhanced */}
          <View style={[styles.soapContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.soapHeader}>
              <Ionicons name="document-text" size={22} color={colors.primary} />
              <Text style={[styles.soapTitle, { color: colors.text }]}>Registro SOAP</Text>
              <View style={[styles.completionBadge, { backgroundColor: `${colors.primary}15` }]}>
                <Text style={[styles.completionText, { color: colors.primary }]}>
                  {completionPercentage}%
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[styles.progressFill, { width: `${completionPercentage}%`, backgroundColor: colors.primary }]}
              />
            </View>

            {/* SOAP Fields */}
            <View style={styles.soapFields}>
              <SOAPInputField
                section={SOAP_SECTIONS.subjective}
                value={subjective}
                onChangeText={setSubjective}
                isFocused={focusedField === 'subjective'}
                onFocus={() => setFocusedField('subjective')}
                onBlur={() => setFocusedField(null)}
                colors={colors}
              />

              <SOAPInputField
                section={SOAP_SECTIONS.objective}
                value={objective}
                onChangeText={setObjective}
                isFocused={focusedField === 'objective'}
                onFocus={() => setFocusedField('objective')}
                onBlur={() => setFocusedField(null)}
                colors={colors}
              />

              <SOAPInputField
                section={SOAP_SECTIONS.assessment}
                value={assessment}
                onChangeText={setAssessment}
                isFocused={focusedField === 'assessment'}
                onFocus={() => setFocusedField('assessment')}
                onBlur={() => setFocusedField(null)}
                colors={colors}
              />

              <SOAPInputField
                section={SOAP_SECTIONS.plan}
                value={plan}
                onChangeText={setPlan}
                isFocused={focusedField === 'plan'}
                onFocus={() => setFocusedField('plan')}
                onBlur={() => setFocusedField(null)}
                colors={colors}
              />
            </View>
          </View>

          {/* Scientific Support - New Section */}
          <Card style={styles.supportCard}>
            <View style={styles.supportHeader}>
              <Ionicons name="library" size={20} color={colors.primary} />
              <Text style={[styles.supportTitle, { color: colors.text }]}>Suporte Científico & Melhores Práticas</Text>
            </View>
            <Text style={[styles.supportText, { color: colors.textSecondary }]}>
              Baseado no diagnóstico e plano, recomendamos:
            </Text>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <Ionicons name="star" size={16} color={colors.warning} />
                <Text style={[styles.tipText, { color: colors.text }]}>Protocolo PRICE para lesões agudas (primeiras 48h).</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="star" size={16} color={colors.warning} />
                <Text style={[styles.tipText, { color: colors.text }]}>Exercícios excêntricos para tendinopatias crônicas.</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.searchBtn, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="search" size={16} color={colors.primary} />
              <Text style={[styles.searchBtnText, { color: colors.primary }]}>Buscar evidências no PubMed</Text>
            </TouchableOpacity>
          </Card>

          {/* Photo Section */}
          <PhotoGrid
            photos={photos}
            onAddPhoto={handleAddPhoto}
            onTakePhoto={handleTakePhoto}
            onRemovePhoto={handleRemovePhoto}
            colors={colors}
          />

          {/* Save Button - Enhanced */}
          <View style={styles.saveSection}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor: canSave ? colors.primary : colors.border,
                  opacity: canSave ? 1 : 0.6,
                },
              ]}
              onPress={handleSave}
              disabled={isCreating || isUpdating || !canSave}
              activeOpacity={0.8}
            >
              {isCreating || isUpdating ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Salvando...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>
                    {isEditing ? 'Atualizar Evolução' : 'Salvar Evolução'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity
                style={[styles.deleteButton, { borderColor: colors.error }]}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                    <Text style={[styles.deleteButtonText, { color: colors.error }]}>Excluir Evolução</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <Text style={[styles.saveHint, { color: colors.textSecondary }]}>
              Preencha pelo menos um campo do SOAP para salvar
            </Text>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  // Header Styles
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
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  headerProgress: {
    marginLeft: 8,
  },

  // Progress Ring Styles
  progressRingContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingBg: {
    position: 'absolute',
  },
  progressRing: {
    position: 'absolute',
    transformOrigin: 'center',
  },
  progressRingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Patient Card Styles
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sessionLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  sessionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Content Styles
  content: {
    flex: 1,
    marginTop: 16,
  },

  // Pain Level Styles
  painContainer: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  painHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  painTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  painDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  painEmojiContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  painEmoji: {
    fontSize: 40,
  },
  painValueSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  painValueBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  painValueText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  painValueLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  painDescriptionCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  painDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
  },

  // SOAP Container Styles
  soapContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  soapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  soapTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    flex: 1,
  },
  completionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // SOAP Fields Styles
  soapFields: {
    gap: 20,
  },
  soapFieldContainer: {
    gap: 10,
  },
  soapFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  soapLetterBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  soapLetterText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  soapFieldHeaderInfo: {
    flex: 1,
  },
  soapFieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  soapFieldDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  completionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soapInputWrapper: {
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
  },
  soapInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 100,
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 0,
  },
  charCount: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Photo Section Styles
  photoContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  photoTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    flex: 1,
  },
  photoCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyPhotoState: {
    alignItems: 'center',
  },
  emptyPhotoButton: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyPhotoIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyPhotoText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyPhotoSubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  photoItem: {
    width: (SCREEN_WIDTH - 32 - 36) / 2,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  addPhotoBtn: {
    width: (SCREEN_WIDTH - 32 - 36) / 2,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  photoActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Save Section Styles
  saveSection: {
    marginHorizontal: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveHint: {
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  supportCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  supportText: {
    fontSize: 13,
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  tipText: {
    fontSize: 13,
    flex: 1,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  searchBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
