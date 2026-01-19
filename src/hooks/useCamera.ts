import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { useCallback, useState } from 'react';

export interface CameraOptions {
  quality?: number;
  allowEditing?: boolean;
  correctOrientation?: boolean;
  saveToGallery?: boolean}

/**
 * Hook para acessar a câmera do dispositivo
 * @returns Estado e funções para capturar e selecionar fotos
 */
export function useCamera(options: CameraOptions = {}) {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const defaultOptions: CameraOptions = {
    quality: 90,
    allowEditing: true,
    correctOrientation: true,
    saveToGallery: false,
    ...options,
  };

  /**
   * Tira uma foto usando a câmera do dispositivo
   * @returns URL da foto ou null se cancelado
   */
  const takePhoto = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);

    try {
      const image = await Camera.getPhoto({
        quality: defaultOptions.quality,
        allowEditing: defaultOptions.allowEditing,
        correctOrientation: defaultOptions.correctOrientation,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      setPhoto(image);
      setIsLoading(false);

      return image.webPath ?? null;
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      setIsLoading(false);
      return null;
    }
  }, [defaultOptions]);

  /**
   * Seleciona uma foto da galeria do dispositivo
   * @returns URL da foto ou null se cancelado
   */
  const pickFromGallery = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);

    try {
      const image = await Camera.getPhoto({
        quality: defaultOptions.quality,
        allowEditing: defaultOptions.allowEditing,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
      });

      setPhoto(image);
      setIsLoading(false);

      return image.webPath ?? null;
    } catch (error) {
      console.error('Erro ao selecionar foto da galeria:', error);
      setIsLoading(false);
      return null;
    }
  }, [defaultOptions]);

  /**
   * Limpa a foto selecionada
   */
  const clearPhoto = useCallback(() => {
    setPhoto(null);
  }, []);

  return {
    photo,
    isLoading,
    takePhoto,
    pickFromGallery,
    clearPhoto,
  };
}

/**
 * Hook específico para capturar fotos de exercícios
 */
export function useExerciseCamera() {
  const { photo, isLoading, takePhoto, pickFromGallery, clearPhoto } = useCamera({
    quality: 90,
    allowEditing: true,
    saveToGallery: true, // Salvar automaticamente na galeria
  });

  return {
    photo,
    isLoading,
    captureExercisePhoto: takePhoto,
    selectFromGallery: pickFromGallery,
    clearPhoto,
  };
}
