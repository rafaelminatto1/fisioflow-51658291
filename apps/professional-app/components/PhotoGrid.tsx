import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useCamera } from '@/hooks/useCamera';
import { Modal } from './Modal';

interface Photo {
  uri: string;
  id: string;
}

interface Props {
  photos: Photo[];
  onAddPhotos: (photos: string[]) => void;
  onRemovePhoto: (id: string) => void;
  maxPhotos?: number;
  editable?: boolean;
}

export function PhotoGrid({
  photos,
  onAddPhotos,
  onRemovePhoto,
  maxPhotos = 10,
  editable = true,
}: Props) {
  const colors = useColors();
  const { pickFromGallery, takePhoto, isLoading } = useCamera();
  const [showPhotoModal, setShowPhotoModal] = React.useState(false);
  const [previewPhoto, setPreviewPhoto] = React.useState<string | null>(null);

  const handleTakePhoto = async () => {
    setShowPhotoModal(false);
    const result = await takePhoto();
    if (result) {
      onAddPhotos([result.uri]);
    }
  };

  const handlePickFromGallery = async () => {
    setShowPhotoModal(false);
    const results = await pickFromGallery(false);
    if (results && results.length > 0) {
      onAddPhotos(results.map((r) => r.uri));
    }
  };

  const handleRemove = (id: string) => {
    Alert.alert('Remover Foto', 'Deseja remover esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => onRemovePhoto(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Fotos ({photos.length}/{maxPhotos})
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.grid}>
          {photos.map((photo) => (
            <TouchableOpacity
              key={photo.id}
              style={styles.photoContainer}
              onPress={() => setPreviewPhoto(photo.uri)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: photo.uri }} style={styles.photo} />
              {editable && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemove(photo.id)}
                >
                  <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}

          {editable && photos.length < maxPhotos && (
            <TouchableOpacity
              style={[styles.addButton, { borderColor: colors.border }]}
              onPress={() => setShowPhotoModal(true)}
            >
              <Ionicons name="camera-outline" size={28} color={colors.textSecondary} />
              <Text style={[styles.addButtonText, { color: colors.textSecondary }]}>
                Adicionar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Photo Options Modal */}
      <Modal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        title="Adicionar Foto"
      >
        <View style={styles.photoOptions}>
          <TouchableOpacity
            style={[styles.photoOption, { backgroundColor: colors.surface }]}
            onPress={handleTakePhoto}
          >
            <Ionicons name="camera" size={28} color={colors.primary} />
            <Text style={[styles.photoOptionText, { color: colors.text }]}>
              Câmera
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.photoOption, { backgroundColor: colors.surface }]}
            onPress={handlePickFromGallery}
          >
            <Ionicons name="images" size={28} color={colors.primary} />
            <Text style={[styles.photoOptionText, { color: colors.text }]}>
              Galeria
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Photo Preview Modal */}
      <Modal
        visible={!!previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        hideCloseButton
      >
        {previewPhoto && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: previewPhoto }} style={styles.preview} resizeMode="contain" />
            <TouchableOpacity
              style={[styles.previewClose, { backgroundColor: colors.surface }]}
              onPress={() => setPreviewPhoto(null)}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 12,
  },
  photoOptions: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 16,
  },
  photoOption: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    gap: 12,
  },
  photoOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: {
    width: '100%',
    height: 300,
  },
  previewClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
