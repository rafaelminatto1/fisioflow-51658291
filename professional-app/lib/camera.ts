import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export interface CameraResult {
  uri: string;
  width: number;
  height: number;
  type?: string;
}

/**
 * Solicita permissão para usar a câmera
 */
export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true; // Web doesn't need explicit permission
  }

  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * Solicita permissão para acessar a galeria
 */
export async function requestGalleryPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true;
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Tira uma foto usando a câmera do dispositivo
 * @param quality Qualidade da imagem (0-1), padrão 0.8
 * @returns URI da foto ou null se cancelado/erro
 */
export async function takePhoto(quality: number = 0.8): Promise<CameraResult | null> {
  const hasPermission = await requestCameraPermission();

  if (!hasPermission) {
    throw new Error('Permissão de câmera não concedida');
  }

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality,
      exif: false,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets?.[0];
    if (!asset) {
      return null;
    }

    return {
      uri: asset.uri,
      width: asset.width || 0,
      height: asset.height || 0,
      type: asset.mimeType,
    };
  } catch (error) {
    console.error('Error taking photo:', error);
    throw error;
  }
}

/**
 * Seleciona uma imagem da galeria
 * @param quality Qualidade da imagem (0-1), padrão 0.8
 * @param allowMultiple Permitir múltiplas seleções
 * @returns Array de URIs ou null se cancelado/erro
 */
export async function pickFromGallery(
  quality: number = 0.8,
  allowMultiple: boolean = false
): Promise<CameraResult[] | null> {
  const hasPermission = await requestGalleryPermission();

  if (!hasPermission) {
    throw new Error('Permissão de galeria não concedida');
  }

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality,
      allowsMultipleSelection: allowMultiple,
      allowsEditing: !allowMultiple,
      aspect: !allowMultiple ? [4, 3] : undefined,
    });

    if (result.canceled) {
      return null;
    }

    const assets = result.assets || [];
    return assets.map((asset) => ({
      uri: asset.uri,
      width: asset.width || 0,
      height: asset.height || 0,
      type: asset.mimeType,
    }));
  } catch (error) {
    console.error('Error picking from gallery:', error);
    throw error;
  }
}

/**
 * Obtém informações sobre um arquivo de imagem
 * @param uri URI da imagem
 */
export async function getImageInfo(uri: string): Promise<{
  width: number;
  height: number;
  type?: string;
} | null> {
  try {
    // For React Native, we can use Image.getSize or similar
    // This is a simplified version
    return { width: 0, height: 0 };
  } catch (error) {
    console.error('Error getting image info:', error);
    return null;
  }
}
