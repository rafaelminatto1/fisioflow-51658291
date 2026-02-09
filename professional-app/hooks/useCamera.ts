import { useState, useCallback } from 'react';
import { takePhoto, pickFromGallery, type CameraResult } from '@/lib/camera';
import { Alert } from 'react-native';

export function useCamera() {
  const [photo, setPhoto] = useState<CameraResult | null>(null);
  const [photos, setPhotos] = useState<CameraResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTakePhoto = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await takePhoto();
      if (result) {
        setPhoto(result);
        return result;
      }
      return null;
    } catch (err: any) {
      const message = err.message || 'Não foi possível tirar a foto';
      setError(message);
      Alert.alert('Erro', message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePickFromGallery = useCallback(async (multiple: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await pickFromGallery(0.8, multiple);
      if (results) {
        if (multiple) {
          setPhotos(results);
        } else {
          setPhoto(results[0] || null);
        }
        return results;
      }
      return null;
    } catch (err: any) {
      const message = err.message || 'Não foi possível selecionar a imagem';
      setError(message);
      Alert.alert('Erro', message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearPhoto = useCallback(() => {
    setPhoto(null);
  }, []);

  const clearPhotos = useCallback(() => {
    setPhotos([]);
  }, []);

  const addPhoto = useCallback((newPhoto: CameraResult) => {
    setPhotos((prev) => [...prev, newPhoto]);
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    photo,
    photos,
    isLoading,
    error,
    takePhoto: handleTakePhoto,
    pickFromGallery: handlePickFromGallery,
    clearPhoto,
    clearPhotos,
    addPhoto,
    removePhoto,
  };
}
