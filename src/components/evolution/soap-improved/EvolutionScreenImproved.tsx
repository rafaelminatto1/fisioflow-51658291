/**
 * EvolutionScreenImproved - Enhanced Evolution Screen for React Native
 *
 * A completely redesigned evolution screen with:
 * - Modern visual hierarchy and information architecture
 * - Consistent V2 design patterns
 * - Better spacing, padding, and layout
 * - Enhanced interactive elements and feedback
 * - Improved mobile responsiveness
 * - Smooth micro-interactions and animations
 * - Professional typography and readability
 * - Clean, clinical appearance that inspires confidence
 *
 * SOAP Sections:
 * - S (Subjetivo) - Patient's reported symptoms
 * - O (Objetivo) - Measurable findings (ADM, força, etc.)
 * - A (Avaliação) - Clinical interpretation
 * - P (Plano) - Treatment plan
 *
 * Additional Features:
 * - Pain level (EVA) selector with visual feedback
 * - Photo attachments with preview
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  UIManager,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ==================== TYPES ====================

interface Photo {
  uri: string;
  id: string;
}

interface SOAPData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

// ==================== CONSTANTS ====================

const COLORS = {
  primary: '#6EC1E4',
  primaryDark: '#4CA6CC',
  primaryLight: '#99DBF5',
  secondary: '#0D9488',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceHover: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
};

const SOAP_SECTIONS = [
  {
    key: 'subjective' as const,
    label: 'Subjetivo',
    shortLabel: 'S',
    iconName: 'person-outline' as keyof typeof Ionicons.glyphMap,
    color: COLORS.info,
    bgColor: '#DBEAFE',
    placeholder: 'Queixa principal, relato do paciente, sintomas...',
    description: 'O que o paciente relatou?',
  },
  {
    key: 'objective' as const,
    label: 'Objetivo',
    shortLabel: 'O',
    iconName: 'eye-outline' as keyof typeof Ionicons.glyphMap,
    color: COLORS.success,
    bgColor: '#D1FAE5',
    placeholder: 'Achados do exame físico, ADM, força, testes...',
    description: 'Dados mensuráveis e observáveis',
  },
  {
    key: 'assessment' as const,
    label: 'Avaliação',
    shortLabel: 'A',
    iconName: 'brain-outline' as keyof typeof Ionicons.glyphMap,
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    placeholder: 'Análise do progresso, resposta ao tratamento...',
    description: 'Sua interpretação profissional',
  },
  {
    key: 'plan' as const,
    label: 'Plano',
    shortLabel: 'P',
    iconName: 'list-outline' as keyof typeof Ionicons.glyphMap,
    color: COLORS.warning,
    bgColor: '#FEF3C7',
    placeholder: 'Conduta, exercícios, orientações, próximos passos...',
    description: 'Próximos passos do tratamento',
  },
];

const PAIN_LEVELS = [
  { value: 0, label: 'Sem dor', color: COLORS.success, iconName: 'happy-outline' },
  { value: 3, label: 'Dor leve', color: '#84CC16', iconName: 'sad-outline' },
  { value: 6, label: 'Dor moderada', color: COLORS.warning, iconName: 'sad-outline' },
  { value: 10, label: 'Dor intensa', color: COLORS.error, iconName: 'alert-circle-outline' },
];

const SCREEN_WIDTH = Dimensions.get('window').width;

// ==================== MAIN COMPONENT ====================

export default function EvolutionScreenImproved() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const patientId = params.id as string;
  const patientName = params.patientName as string || 'Paciente';

  // Form state
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [painLevel, setPainLevel] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);

  // UI state
  const [expandedSOAP, setExpandedSOAP] = useState<string | null>('subjective');
  const [isSaving, setIsSaving] = useState(false);
  const [painAnimation] = useState(new Animated.Value(0));

  const handleSave = async () => {
    if (!subjective.trim() && !objective.trim() && !assessment.trim() && !plan.trim()) {
      Alert.alert('Atenção', 'Preencha pelo menos um campo do SOAP');
      return;
    }

    setIsSaving(true);

    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      Alert.alert('Sucesso', 'Evolução registrada com sucesso', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }, 1000);
  };

  const handleAddPhoto = async () => {
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
        const newPhotos = result.assets.map((asset, index) => ({
          uri: asset.uri,
          id: `photo-${Date.now()}-${index}`,
        }));
        setPhotos([...photos, ...newPhotos]);
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível adicionar fotos.');
    }
  };

  const handleTakePhoto = async () => {
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
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível tirar foto.');
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(photos.filter((p) => p.id !== id));
  };

  const handlePainLevelChange = (level: number) => {
    setPainLevel(level);

    // Animate pain indicator
    Animated.sequence([
      Animated.timing(painAnimation, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(painAnimation, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const getPainConfig = (level: number) => {
    if (level === 0) return PAIN_LEVELS[0];
    if (level <= 3) return PAIN_LEVELS[1];
    if (level <= 6) return PAIN_LEVELS[2];
    return PAIN_LEVELS[3];
  };

  const painConfig = getPainConfig(painLevel);

  const getSOAPValue = (key: string) => {
    switch (key) {
      case 'subjective': return subjective;
      case 'objective': return objective;
      case 'assessment': return assessment;
      case 'plan': return plan;
      default: return '';
    }
  };

  const setSOAPValue = (key: string, value: string) => {
    switch (key) {
      case 'subjective': setSubjective(value); break;
      case 'objective': setObjective(value); break;
      case 'assessment': setAssessment(value); break;
      case 'plan': setPlan(value); break;
    }
  };

  const getCompletionPercentage = () => {
    const sections = [subjective, objective, assessment, plan];
    const completed = sections.filter(s => s.trim().length >= 10).length;
    return Math.round((completed / sections.length) * 100);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Nova Evolução</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Patient Info Card */}
        <PatientInfoCard patientName={patientName} />

        {/* Pain Level Block */}
        <PainLevelBlock
          painLevel={painLevel}
          painConfig={painConfig}
          onChange={handlePainLevelChange}
          animation={painAnimation}
        />

        {/* SOAP Progress */}
        <SOAPProgressCard completionPercentage={getCompletionPercentage()} />

        {/* SOAP Sections */}
        {SOAP_SECTIONS.map((section) => (
          <SOAPSectionCard
            key={section.key}
            section={section}
            value={getSOAPValue(section.key)}
            onChange={(value) => setSOAPValue(section.key, value)}
            isExpanded={expandedSOAP === section.key}
            onToggle={() => setExpandedSOAP(expandedSOAP === section.key ? null : section.key)}
          />
        ))}

        {/* Photos Block */}
        <PhotosBlock
          photos={photos}
          onAddPhoto={handleAddPhoto}
          onTakePhoto={handleTakePhoto}
          onRemovePhoto={handleRemovePhoto}
        />

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.9}
        >
          {isSaving ? (
            <>
              <View style={styles.loadingSpinner} />
              <Text style={styles.saveButtonText}>Salvando...</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Salvar Evolução</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== SUB-COMPONENTS ====================

// Patient Info Card
const PatientInfoCard: React.FC<{ patientName: string }> = ({ patientName }) => {
  const [currentDate] = useState(() => new Date());

  const formattedDate = currentDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <View style={styles.card}>
      <View style={styles.patientInfoContent}>
        <View style={styles.patientAvatar}>
          <Ionicons name="person" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.patientDetails}>
          <Text style={styles.patientLabel}>Paciente</Text>
          <Text style={styles.patientName}>{patientName}</Text>
        </View>
        <View style={styles.dateBadge}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>
      </View>
    </View>
  );
};

// Pain Level Block
const PainLevelBlock: React.FC<{
  painLevel: number;
  painConfig: { value: number; label: string; color: string; iconName: any };
  onChange: (level: number) => void;
  animation: Animated.Value;
}> = ({ painLevel, painConfig, onChange, animation }) => {
  const [sliderWidth, setSliderWidth] = useState(0);

  const thumbPosition = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderIcon}>
          <Ionicons name="pulse" size={18} color={COLORS.error} />
        </View>
        <View style={styles.cardHeaderTitles}>
          <Text style={styles.cardHeaderTitle}>Nível de Dor</Text>
          <Text style={styles.cardHeaderSubtitle}>Escala Visual Analógica (EVA)</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        {/* Pain Display */}
        <View style={styles.painDisplay}>
          <Animated.View
            style={[
              styles.painValueContainer,
              { backgroundColor: painConfig.color, transform: [{ scale: thumbPosition }] }
            ]}
          >
            <Text style={styles.painValue}>{painLevel}</Text>
          </Animated.View>
          <View style={styles.painInfo}>
            <Text style={[styles.painLabel, { color: painConfig.color }]}>
              {painConfig.label}
            </Text>
            <Text style={styles.painScale}>Escala de 0 a 10</Text>
          </View>
        </View>

        {/* Slider */}
        <View
          style={styles.sliderContainer}
          onLayout={(e: LayoutChangeEvent) => setSliderWidth(e.nativeEvent.layout.width)}
        >
          <View style={styles.sliderTrack}>
            <View
              style={[
                styles.sliderFill,
                {
                  width: `${(painLevel / 10) * 100}%`,
                  backgroundColor: painConfig.color,
                },
              ]}
            />
          </View>
          <View
            style={[
              styles.sliderThumb,
              { left: `${(painLevel / 10) * 100}%`, backgroundColor: painConfig.color },
            ]}
          />
          <View style={styles.sliderMarks}>
            {[0, 2, 4, 6, 8, 10].map((num) => (
              <Text key={num} style={styles.sliderMark}>{num}</Text>
            ))}
          </View>
        </View>

        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>Sem dor</Text>
          <Text style={styles.sliderLabel}>Moderada</Text>
          <Text style={styles.sliderLabel}>Máxima</Text>
        </View>

        {/* Quick Presets */}
        <View style={styles.painPresets}>
          {PAIN_LEVELS.map((preset) => (
            <TouchableOpacity
              key={preset.value}
              style={[
                styles.painPreset,
                painLevel === preset.value && { backgroundColor: preset.color, borderWidth: 0 },
              ]}
              onPress={() => onChange(preset.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={preset.iconName}
                size={20}
                color={painLevel === preset.value ? '#FFFFFF' : preset.color}
              />
              <Text
                style={[
                  styles.painPresetValue,
                  painLevel === preset.value && styles.painPresetValueActive,
                ]}
              >
                {preset.value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

// SOAP Progress Card
const SOAPProgressCard: React.FC<{ completionPercentage: number }> = ({ completionPercentage }) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderIcon}>
          <Ionicons name="document-text" size={18} color={COLORS.primary} />
        </View>
        <View style={styles.cardHeaderTitles}>
          <Text style={styles.cardHeaderTitle}>Registro SOAP</Text>
        </View>
        <View style={[styles.progressBadge, { backgroundColor: completionPercentage === 100 ? COLORS.primary + '20' : COLORS.surface }]}>
          <Text style={[styles.progressBadgeText, { color: completionPercentage === 100 ? COLORS.primary : COLORS.textSecondary }]}>
            {completionPercentage}% completo
          </Text>
        </View>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarTrack}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { width: `${completionPercentage}%` }
            ]}
          />
        </View>
      </View>
    </View>
  );
};

// SOAP Section Card
const SOAPSectionCard: React.FC<{
  section: typeof SOAP_SECTIONS[0];
  value: string;
  onChange: (value: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ section, value, onChange, isExpanded, onToggle }) => {
  const hasContent = value.trim().length > 0;

  return (
    <View style={[styles.card, styles.soapCard, isExpanded && { borderColor: section.color }]}>
      <TouchableOpacity
        style={styles.soapCardHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.soapLabelBadge, { backgroundColor: section.bgColor }]}>
          <Text style={[styles.soapLabelText, { color: section.color }]}>{section.shortLabel}</Text>
        </View>
        <Text style={styles.soapFieldLabel}>{section.label}</Text>
        {hasContent && (
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} style={styles.soapCheckIcon} />
        )}
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.soapCardContent}>
          <TextInput
            style={[styles.soapInput, { borderColor: section.color }]}
            value={value}
            onChangeText={onChange}
            placeholder={section.placeholder}
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <Text style={styles.soapDescription}>
            <Ionicons name={section.iconName} size={14} color={COLORS.textSecondary} /> {section.description}
          </Text>
        </View>
      )}
    </View>
  );
};

// Photos Block
const PhotosBlock: React.FC<{
  photos: Photo[];
  onAddPhoto: () => void;
  onTakePhoto: () => void;
  onRemovePhoto: (id: string) => void;
}> = ({ photos, onAddPhoto, onTakePhoto, onRemovePhoto }) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderIcon}>
          <Ionicons name="camera" size={18} color={COLORS.primary} />
        </View>
        <View style={styles.cardHeaderTitles}>
          <Text style={styles.cardHeaderTitle}>Fotos</Text>
        </View>
        {photos.length > 0 && (
          <Text style={styles.photoCount}>{photos.length}/5</Text>
        )}
      </View>

      <View style={styles.cardContent}>
        {photos.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyPhotos}
            onPress={onAddPhoto}
            activeOpacity={0.7}
          >
            <Ionicons name="images" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyPhotosText}>Adicionar fotos</Text>
            <Text style={styles.emptyPhotosSubtext}>Toque para selecionar da galeria</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.photosGrid}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoContainer}>
                {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
                {require('react-native').Image && (
                  //@ts-ignore
                  <require('react-native').Image
                    source={{ uri: photo.uri }}
                    style={styles.photo}
                  />
                )}
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => onRemovePhoto(photo.id)}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={onAddPhoto}
              >
                <Ionicons name="add" size={32} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.photoButtons}>
          <TouchableOpacity
            style={[styles.photoActionButton, { backgroundColor: COLORS.primary }]}
            onPress={onAddPhoto}
          >
            <Ionicons name="images" size={20} color="#FFFFFF" />
            <Text style={styles.photoActionText}>Galeria</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.photoActionButton, { backgroundColor: COLORS.info }]}
            onPress={onTakePhoto}
          >
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.photoActionText}>Câmera</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 16,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderTitles: {
    flex: 1,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardHeaderSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardContent: {
    padding: 16,
  },
  // Patient Info
  patientInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  patientDetails: {
    flex: 1,
  },
  patientLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  // Pain Level
  painDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  painValueContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  painValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  painInfo: {
    flex: 1,
  },
  painLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  painScale: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sliderContainer: {
    height: 40,
    marginBottom: 8,
  },
  sliderTrack: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    top: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    marginLeft: -6,
  },
  sliderMarks: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sliderMark: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  painPresets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  painPreset: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  painPresetValue: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  painPresetValueActive: {
    color: '#FFFFFF',
  },
  // Progress
  progressBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  // SOAP Cards
  soapCard: {
    marginTop: 12,
    borderWidth: 1,
  },
  soapCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  soapLabelBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  soapLabelText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  soapFieldLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  soapCheckIcon: {
    marginLeft: 8,
  },
  soapCardContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 0,
  },
  soapInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    textAlignVertical: 'top',
  },
  soapDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  // Photos
  photoCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  emptyPhotos: {
    alignItems: 'center',
    paddingVertical: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    borderColor: COLORS.border,
  },
  emptyPhotosText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptyPhotosSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 16,
  },
  photoContainer: {
    width: (SCREEN_WIDTH - 32 - 24) / 2,
    aspectRatio: 1,
    margin: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: (SCREEN_WIDTH - 32 - 24) / 2,
    aspectRatio: 1,
    margin: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: COLORS.border,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  photoActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Save Button
  saveButton: {
    marginHorizontal: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingSpinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
});
