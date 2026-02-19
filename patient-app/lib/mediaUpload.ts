/**
 * Media Upload Module
 *
 * Sistema de upload de mídia (fotos e vídeos) para Firebase Storage
 * com compressão automática, cache local e suporte offline.
 *
 * @module lib/mediaUpload
 */

import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tipos de mídia suportados
 */
export type MediaType = 'image' | 'video' | 'document';

/**
 * Configuração de upload
 */
export interface UploadConfig {
  compress?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
}

/**
 * Resultado de um upload
 */
export interface UploadResult {
  url: string;
  name: string;
  type: MediaType;
  size: number;
  path: string;
}

/**
 * Progresso de upload
 */
export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-1
}

/**
 * Configurações padrão
 */
const DEFAULT_CONFIG: UploadConfig = {
  compress: true,
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
};

/**
 * Classe gerenciadora de uploads de mídia
 */
export class MediaUploader {
  private userId: string;
  private uploadTasks: Map<string, any> = new Map();

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Solicita permissão para acessar a galeria
   */
  async requestGalleryPermission(): Promise<boolean> {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return permission.granted;
    } catch (error) {
      console.error('Error requesting gallery permission:', error);
      return false;
    }
  }

  /**
   * Solicita permissão para acessar a câmera
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      return permission.granted;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  /**
   * Abre o seletor de imagem
   */
  async pickImage(config: UploadConfig = DEFAULT_CONFIG): Promise<UploadResult | null> {
    try {
      // Verificar permissão
      const hasPermission = await this.requestGalleryPermission();
      if (!hasPermission) {
        throw new Error('Permissão negada para acessar a galeria');
      }

      // Abrir seletor
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const asset = result.assets[0];

      // Processar e fazer upload
      return await this.uploadImage(asset.uri, asset.fileName || 'image.jpg', config);
    } catch (error) {
      console.error('Error picking image:', error);
      throw error;
    }
  }

  /**
   * Tira uma foto com a câmera
   */
  async takePhoto(config: UploadConfig = DEFAULT_CONFIG): Promise<UploadResult | null> {
    try {
      // Verificar permissão
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) {
        throw new Error('Permissão negada para acessar a câmera');
      }

      // Abrir câmera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const asset = result.assets[0];

      // Processar e fazer upload
      return await this.uploadImage(asset.uri, asset.fileName || 'photo.jpg', config);
    } catch (error) {
      console.error('Error taking photo:', error);
      throw error;
    }
  }

  /**
   * Seleciona um vídeo
   */
  async pickVideo(): Promise<UploadResult | null> {
    try {
      const hasPermission = await this.requestGalleryPermission();
      if (!hasPermission) {
        throw new Error('Permissão negada');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const asset = result.assets[0];
      return await this.uploadVideo(asset.uri, asset.fileName || 'video.mp4');
    } catch (error) {
      console.error('Error picking video:', error);
      throw error;
    }
  }

  /**
   * Faz upload de uma imagem
   */
  async uploadImage(
    uri: string,
    fileName: string,
    config: UploadConfig = DEFAULT_CONFIG,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Comprimir imagem se configurado
      let processedUri = uri;

      if (config.compress) {
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: config.maxWidth, height: config.maxHeight } }],
          { compress: config.quality, format: ImageManipulator.SaveFormat.JPEG }
        );
        processedUri = manipulated.uri;
      }

      // Obter tamanho do arquivo
      const fileInfo = await FileSystem.getInfoAsync(processedUri);
      const size = fileInfo.size || 0;

      // Ler arquivo como blob
      const blob = await this.uriToBlob(processedUri);

      // Gerar path único
      const timestamp = Date.now();
      const path = `users/${this.userId}/media/${timestamp}_${fileName}`;

      // Upload para Firebase Storage
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      // Monitorar progresso
      uploadTask.on('state_changed', (snapshot) => {
        const progress = snapshot.bytesTransferred / snapshot.totalBytes;
        onProgress?.({
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          progress,
        });
      });

      // Aguardar conclusão
      await uploadTask;

      // Obter URL de download
      const url = await getDownloadURL(storageRef);

      // Salvar cache local
      await this.saveToCache(path, url, 'image', size);

      return {
        url,
        name: fileName,
        type: 'image',
        size,
        path,
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Faz upload de um vídeo
   */
  async uploadVideo(
    uri: string,
    fileName: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Obter tamanho do arquivo
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const size = fileInfo.size || 0;

      // Ler arquivo como blob
      const blob = await this.uriToBlob(uri);

      // Gerar path único
      const timestamp = Date.now();
      const path = `users/${this.userId}/media/${timestamp}_${fileName}`;

      // Upload
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on('state_changed', (snapshot) => {
        const progress = snapshot.bytesTransferred / snapshot.totalBytes;
        onProgress?.({
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          progress,
        });
      });

      await uploadTask;

      const url = await getDownloadURL(storageRef);

      await this.saveToCache(path, url, 'video', size);

      return {
        url,
        name: fileName,
        type: 'video',
        size,
        path,
      };
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  }

  /**
   * Faz upload de um documento genérico
   */
  async uploadDocument(
    uri: string,
    fileName: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      const blob = await this.uriToBlob(uri);
      const timestamp = Date.now();
      const path = `users/${this.userId}/documents/${timestamp}_${fileName}`;

      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on('state_changed', (snapshot) => {
        const progress = snapshot.bytesTransferred / snapshot.totalBytes;
        onProgress?.({
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          progress,
        });
      });

      await uploadTask;

      const url = await getDownloadURL(storageRef);
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const size = fileInfo.size || 0;

      await this.saveToCache(path, url, 'document', size);

      return {
        url,
        name: fileName,
        type: 'document',
        size,
        path,
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Deleta um arquivo do storage
   */
  async deleteFile(storagePath: string): Promise<void> {
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);

      // Remover do cache
      await this.removeFromCache(storagePath);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Converte URI para Blob
   */
  private async uriToBlob(uri: string): Promise<Blob> {
    const response = await fetch(uri);
    return await response.blob();
  }

  /**
   * Salva informações do arquivo no cache local
   */
  private async saveToCache(
    path: string,
    url: string,
    type: MediaType,
    size: number
  ): Promise<void> {
    try {
      const cacheKey = `media_cache_${this.userId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      const cache = cached ? JSON.parse(cached) : {};

      cache[path] = { url, type, size, timestamp: Date.now() };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  /**
   * Remove do cache local
   */
  private async removeFromCache(path: string): Promise<void> {
    try {
      const cacheKey = `media_cache_${this.userId}`;
      const cached = await AsyncStorage.getItem(cacheKey);

      if (cached) {
        const cache = JSON.parse(cached);
        delete cache[path];
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cache));
      }
    } catch (error) {
      console.error('Error removing from cache:', error);
    }
  }

  /**
   * Busca metadados do cache local
   */
  async getFromCache(path: string): Promise<{ url: string; type: MediaType; size: number } | null> {
    try {
      const cacheKey = `media_cache_${this.userId}`;
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) return null;

      const cache = JSON.parse(cached);
      return cache[path] || null;
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Limpa o cache local
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(`media_cache_${this.userId}`);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Cancela um upload em andamento
   */
  cancelUpload(taskId: string): void {
    const task = this.uploadTasks.get(taskId);
    if (task) {
      task.cancel();
      this.uploadTasks.delete(taskId);
    }
  }
}

/**
 * Hook React para usar MediaUploader
 */
export function useMediaUploader(userId?: string) {
  const [uploader] = useState(() => new MediaUploader(userId || ''));
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const pickImage = async (config?: UploadConfig) => {
    if (!userId) throw new Error('User ID required');
    setUploading(true);
    setProgress(0);

    try {
      const result = await uploader.pickImage(config, (p) => {
        setProgress(p.progress);
      });

      return result;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const takePhoto = async (config?: UploadConfig) => {
    if (!userId) throw new Error('User ID required');
    setUploading(true);
    setProgress(0);

    try {
      const result = await uploader.takePhoto(config, (p) => {
        setProgress(p.progress);
      });

      return result;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const pickVideo = async () => {
    if (!userId) throw new Error('User ID required');
    setUploading(true);
    setProgress(0);

    try {
      const result = await uploader.pickVideo((p) => {
        setProgress(p.progress);
      });

      return result;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const uploadDocument = async (uri: string, fileName: string) => {
    if (!userId) throw new Error('User ID required');
    setUploading(true);
    setProgress(0);

    try {
      const result = await uploader.uploadDocument(uri, fileName, (p) => {
        setProgress(p.progress);
      });

      return result;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const deleteFile = async (storagePath: string) => {
    return await uploader.deleteFile(storagePath);
  };

  return {
    uploader,
    uploading,
    progress,
    pickImage,
    takePhoto,
    pickVideo,
    uploadDocument,
    deleteFile,
    clearCache: () => uploader.clearCache(),
  };
}

export default MediaUploader;
