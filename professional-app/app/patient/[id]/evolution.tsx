import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { Button, Card, Slider } from '@/components';
import { useHaptics } from '@/hooks/useHaptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEvolution } from '@/lib/firestore';
import { useAuthStore } from '@/store/auth';
import * as ImagePicker from 'expo-image-picker';

interface Photo {
  uri: string;
  id: string;
}

export default function EvolutionScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const patientId = params.id as string;
  const patientName = params.patientName as string || 'Paciente';

  const { user } = useAuthStore();
  const { medium, success, error: hapticError } = useHaptics();
  const queryClient = useQueryClient();

  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [painLevel, setPainLevel] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);

  const createMutation = useMutation({
    mutationFn: (data: Omit<Parameters<typeof createEvolution>[1], 'professionalId'>) =>
      createEvolution(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientEvolutions', patientId] });
      success();
      Alert.alert('Sucesso', 'Evolução registrada com sucesso', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    },
    onError: () => {
      hapticError();
      Alert.alert('Erro', 'Não foi possível salvar a evolução. Tente novamente.');
    },
  });

  const handleSave = async () => {
    medium();

    if (!subjective.trim() && !objective.trim() && !assessment.trim() && !plan.trim()) {
      Alert.alert('Atenção', 'Preencha pelo menos um campo do SOAP');
      hapticError();
      return;
    }

    try {
      const evolutionData = {
        patientId,
        subjective: subjective.trim(),
        objective: objective.trim(),
        assessment: assessment.trim(),
        plan: plan.trim(),
        painLevel,
        exercises: [],
        attachments: photos.map(p => p.uri),
      };

      await createMutation.mutateAsync(evolutionData);
    } catch (err) {
      // Error handled in mutation
    }
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
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultiple: true,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map((asset, index) => ({
          uri: asset.uri,
          id: `photo-${Date.now()}-${index}`,
        }));
        setPhotos([...photos, ...newPhotos]);
        success();
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

  const getPainColor = (level: number) => {
    if (level <= 3) return colors.success;
    if (level <= 6) return colors.warning;
    return colors.error;
  };

  const getPainDescription = (level: number) => {
    if (level === 0) return 'Sem dor';
    if (level <= 3) return 'Dor leve - Paciente consegue realizar atividades normalmente';
    if (level <= 6) return 'Dor moderada - Paciente sente desconforto mas consegue continuar';
    return 'Dor intensa - Paciente precisa interromper atividades';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Nova Evolução</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Patient Info */}
      <View style={[styles.patientInfo, { backgroundColor: colors.surface }]}>
        <Ionicons name="person" size={20} color={colors.primary} />
        <Text style={[styles.patientName, { color: colors.text }]}>{patientName}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pain Level */}
        <Card style={styles.sectionCard} padding="sm">
          <View style={styles.sectionHeader}>
            <Ionicons name="pulse" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Nível de Dor (EVA)</Text>
          </View>

          <View style={styles.painDisplay}>
            <View style={[styles.painValueContainer, { backgroundColor: getPainColor(painLevel) }]}>
              <Text style={[styles.painValue, { color: '#FFFFFF' }]}>{painLevel}</Text>
            </View>
            <Text style={[styles.painLabel, { color: colors.text }]}>/ 10</Text>
            <Text style={[styles.painDescription, { color: colors.textSecondary }]}>
              {getPainDescription(painLevel)}
            </Text>
          </View>

          <Slider
            minValue={0}
            maxValue={10}
            step={1}
            value={painLevel}
            onValueChange={setPainLevel}
            marks={[0, 2, 4, 6, 8, 10]}
          />
        </Card>

        {/* SOAP */}
        <Card style={styles.sectionCard} padding="sm">
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Registro SOAP</Text>
          </View>

          {/* Subjective */}
          <View style={styles.soapField}>
            <View style={styles.soapLabelRow}>
              <View style={[styles.soapLabelBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.soapLabelText, { color: '#FFFFFF' }]}>S</Text>
              </View>
              <Text style={[styles.soapFieldLabel, { color: colors.text }]}>Subjetivo</Text>
            </View>
            <TextInput
              style={[styles.soapInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={subjective}
              onChangeText={setSubjective}
              placeholder="O que o paciente relatou?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Objective */}
          <View style={styles.soapField}>
            <View style={styles.soapLabelRow}>
              <View style={[styles.soapLabelBadge, { backgroundColor: colors.info }]}>
                <Text style={[styles.soapLabelText, { color: '#FFFFFF' }]}>O</Text>
              </View>
              <Text style={[styles.soapFieldLabel, { color: colors.text }]}>Objetivo</Text>
            </View>
            <TextInput
              style={[styles.soapInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={objective}
              onChangeText={setObjective}
              placeholder="Dados mensuráveis (ADM, força, etc.)"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Assessment */}
          <View style={styles.soapField}>
            <View style={styles.soapLabelRow}>
              <View style={[styles.soapLabelBadge, { backgroundColor: colors.warning }]}>
                <Text style={[styles.soapLabelText, { color: '#FFFFFF' }]}>A</Text>
              </View>
              <Text style={[styles.soapFieldLabel, { color: colors.text }]}>Avaliação</Text>
            </View>
            <TextInput
              style={[styles.soapInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={assessment}
              onChangeText={setAssessment}
              placeholder="Sua interpretação profissional"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Plan */}
          <View style={styles.soapField}>
            <View style={styles.soapLabelRow}>
              <View style={[styles.soapLabelBadge, { backgroundColor: colors.success }]}>
                <Text style={[styles.soapLabelText, { color: '#FFFFFF' }]}>P</Text>
              </View>
              <Text style={[styles.soapFieldLabel, { color: colors.text }]}>Plano</Text>
            </View>
            <TextInput
              style={[styles.soapInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={plan}
              onChangeText={setPlan}
              placeholder="Próximos passos do tratamento"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </Card>

        {/* Photos */}
        <Card style={styles.sectionCard} padding="sm">
          <View style={styles.sectionHeader}>
            <Ionicons name="camera" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Fotos</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {photos.length}/5
            </Text>
          </View>

          {photos.length > 0 ? (
            <View style={styles.photosGrid}>
              {photos.map((photo) => (
                <View key={photo.id} style={styles.photoContainer}>
                  {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photo}
                  />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => {
                      medium();
                      setPhotos(photos.filter((p) => p.id !== photo.id));
                    }}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 5 && (
                <TouchableOpacity
                  style={[styles.addPhotoButton, { borderColor: colors.border }]}
                  onPress={handleAddPhoto}
                >
                  <Ionicons name="add" size={32} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.emptyPhotos, { borderColor: colors.border }]}
              onPress={handleAddPhoto}
            >
              <Ionicons name="images" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyPhotosText, { color: colors.textSecondary }]}>
                Adicionar fotos
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.photoButtons}>
            <TouchableOpacity
              style={[styles.photoActionButton, { backgroundColor: colors.primary }]}
              onPress={handleAddPhoto}
            >
              <Ionicons name="images" size={20} color="#FFFFFF" />
              <Text style={styles.photoActionText}>Galeria</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoActionButton, { backgroundColor: colors.info }]}
              onPress={handleTakePhoto}
            >
              <Ionicons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.photoActionText}>Câmera</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Save Button */}
        <Button
          title="Salvar Evolução"
          onPress={handleSave}
          loading={createMutation.isPending}
          style={styles.saveButton}
        />

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

import { Image } from 'react-native';

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
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionSubtitle: {
    marginLeft: 'auto',
    fontSize: 14,
  },
  painDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  painValueContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  painValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  painLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  painDescription: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  soapField: {
    marginBottom: 20,
  },
  soapLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  soapLabelBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soapLabelText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  soapFieldLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  soapInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  photoContainer: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPhotos: {
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    paddingVertical: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyPhotosText: {
    fontSize: 14,
    marginTop: 8,
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
    borderRadius: 10,
    gap: 8,
  },
  photoActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 8,
  },
});
