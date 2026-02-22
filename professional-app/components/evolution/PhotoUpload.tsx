import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useHaptics } from '@/hooks/useHaptics';

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  colors: any;
}

export function PhotoUpload({ photos, onPhotosChange, maxPhotos = 6, colors }: PhotoUploadProps) {
  const { light, medium, error: hapticError } = useHaptics();
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permissões Necessárias',
        'Precisamos de permissão para acessar a câmera e galeria de fotos.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async (useCamera: boolean) => {
    medium();
    
    if (photos.length >= maxPhotos) {
      hapticError();
      Alert.alert('Limite Atingido', `Você pode adicionar no máximo ${maxPhotos} fotos.`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setUploading(true);
      
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
            allowsMultipleSelection: true,
          });

      if (!result.canceled) {
        const newPhotos = result.assets.map(asset => asset.uri);
        const updatedPhotos = [...photos, ...newPhotos].slice(0, maxPhotos);
        onPhotosChange(updatedPhotos);
        light();
      }
    } catch (error) {
      hapticError();
      Alert.alert('Erro', 'Não foi possível adicionar a foto.');
      console.error('Error picking image:', error);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    medium();
    Alert.alert(
      'Remover Foto',
      'Deseja remover esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            const updatedPhotos = photos.filter((_, i) => i !== index);
            onPhotosChange(updatedPhotos);
            light();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Ionicons name="camera-outline" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Fotos</Text>
        <Text style={[styles.counter, { color: colors.textSecondary }]}>
          {photos.length}/{maxPhotos}
        </Text>
      </View>

      {photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photosScroll}
          contentContainerStyle={styles.photosContent}
        >
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoContainer}>
              <Image source={{ uri: photo }} style={styles.photo} />
              <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: colors.error }]}
                onPress={() => removePhoto(index)}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {photos.length < maxPhotos && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => pickImage(true)}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Tirar Foto</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.info }]}
            onPress={() => pickImage(false)}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="images" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Galeria</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Adicione fotos para documentar a evolução do paciente
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  counter: {
    fontSize: 14,
  },
  photosScroll: {
    marginVertical: 8,
  },
  photosContent: {
    gap: 12,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
  },
});
