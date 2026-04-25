import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { mediaApi, api } from "./api";
import { log } from "@/lib/logger";

export type MediaType = "image" | "video" | "document";

export interface UploadConfig {
  compress?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface UploadResult {
  url: string;
  name: string;
  type: MediaType;
  size: number;
  path: string;
}

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

const DEFAULT_CONFIG: UploadConfig = {
  compress: true,
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
};

function sanitizeFileName(fileName: string, fallback: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) return fallback;
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function inferContentType(fileName: string, fallback: MediaType): string {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".gif")) return "image/gif";
  if (normalized.endsWith(".mp4")) return "video/mp4";
  if (normalized.endsWith(".webm")) return "video/webm";
  if (normalized.endsWith(".mov")) return "video/quicktime";
  if (normalized.endsWith(".pdf")) return "application/pdf";
  if (normalized.endsWith(".doc")) return "application/msword";
  if (normalized.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return fallback === "video"
    ? "video/mp4"
    : fallback === "document"
      ? "application/octet-stream"
      : "image/jpeg";
}

export class MediaUploader {
  private userId: string;
  private uploadTasks: Map<string, AbortController> = new Map();

  constructor(userId: string) {
    this.userId = userId;
  }

  async requestGalleryPermission(): Promise<boolean> {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return permission.granted;
    } catch (error) {
      log.error("Error requesting gallery permission:", error);
      return false;
    }
  }

  async requestCameraPermission(): Promise<boolean> {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      return permission.granted;
    } catch (error) {
      log.error("Error requesting camera permission:", error);
      return false;
    }
  }

  async pickImage(
    config: UploadConfig = DEFAULT_CONFIG,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult | null> {
    const hasPermission = await this.requestGalleryPermission();
    if (!hasPermission) {
      throw new Error("Permissao negada para acessar a galeria");
    }

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
    return this.uploadImage(asset.uri, asset.fileName || "image.jpg", config, onProgress);
  }

  async takePhoto(
    config: UploadConfig = DEFAULT_CONFIG,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult | null> {
    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) {
      throw new Error("Permissao negada para acessar a camera");
    }

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
    return this.uploadImage(asset.uri, asset.fileName || "photo.jpg", config, onProgress);
  }

  async pickVideo(onProgress?: (progress: UploadProgress) => void): Promise<UploadResult | null> {
    const hasPermission = await this.requestGalleryPermission();
    if (!hasPermission) {
      throw new Error("Permissao negada para acessar a galeria");
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
    return this.uploadVideo(asset.uri, asset.fileName || "video.mp4", onProgress);
  }

  async uploadImage(
    uri: string,
    fileName: string,
    config: UploadConfig = DEFAULT_CONFIG,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> {
    let processedUri = uri;

    if (config.compress) {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: config.maxWidth, height: config.maxHeight } }],
        { compress: config.quality, format: ImageManipulator.SaveFormat.JPEG },
      );
      processedUri = manipulated.uri;
    }

    return this.uploadToR2(
      processedUri,
      sanitizeFileName(fileName, "image.jpg"),
      "image",
      onProgress,
    );
  }

  async uploadVideo(
    uri: string,
    fileName: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> {
    return this.uploadToR2(uri, sanitizeFileName(fileName, "video.mp4"), "video", onProgress);
  }

  async uploadDocument(
    uri: string,
    fileName: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> {
    return this.uploadToR2(uri, sanitizeFileName(fileName, "document.bin"), "document", onProgress);
  }

  async deleteFile(storagePath: string): Promise<void> {
    try {
      await api.delete(`/api/media/${storagePath}`);
      await this.removeFromCache(storagePath);
    } catch (error) {
      log.error("Error deleting file:", error);
      throw error;
    }
  }

  private async uploadToR2(
    uri: string,
    fileName: string,
    type: MediaType,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    const size = fileInfo.exists && "size" in fileInfo ? fileInfo.size || 0 : 0;
    const contentType = inferContentType(fileName, type);
    const taskId = `${this.userId}:${Date.now()}:${fileName}`;
    const controller = new AbortController();
    this.uploadTasks.set(taskId, controller);

    try {
      const upload = await mediaApi.getUploadUrl({
        filename: fileName,
        contentType,
        folder: type === "document" ? "documents" : "uploads",
      });

      const blob = await this.uriToBlob(uri);

      onProgress?.({
        bytesTransferred: 0,
        totalBytes: size,
        progress: 0,
      });

      const response = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
        },
        body: blob,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Falha no upload (${response.status})`);
      }

      onProgress?.({
        bytesTransferred: size,
        totalBytes: size,
        progress: 1,
      });

      await this.saveToCache(upload.key, upload.publicUrl, type, size);

      return {
        url: upload.publicUrl,
        name: fileName,
        type,
        size,
        path: upload.key,
      };
    } catch (error) {
      log.error("Error uploading media:", error);
      throw error;
    } finally {
      this.uploadTasks.delete(taskId);
    }
  }

  private async uriToBlob(uri: string): Promise<Blob> {
    const response = await fetch(uri);
    return response.blob();
  }

  private async saveToCache(
    path: string,
    url: string,
    type: MediaType,
    size: number,
  ): Promise<void> {
    try {
      const cacheKey = `media_cache_${this.userId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      const cache = cached ? JSON.parse(cached) : {};

      cache[path] = { url, type, size, timestamp: Date.now() };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch (error) {
      log.error("Error saving to cache:", error);
    }
  }

  private async removeFromCache(path: string): Promise<void> {
    try {
      const cacheKey = `media_cache_${this.userId}`;
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) {
        return;
      }

      const cache = JSON.parse(cached);
      delete cache[path];
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch (error) {
      log.error("Error removing from cache:", error);
    }
  }

  async getFromCache(path: string): Promise<{ url: string; type: MediaType; size: number } | null> {
    try {
      const cacheKey = `media_cache_${this.userId}`;
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) return null;

      const cache = JSON.parse(cached);
      return cache[path] || null;
    } catch (error) {
      log.error("Error getting from cache:", error);
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(`media_cache_${this.userId}`);
    } catch (error) {
      log.error("Error clearing cache:", error);
    }
  }

  cancelUpload(taskId: string): void {
    const controller = this.uploadTasks.get(taskId);
    if (!controller) {
      return;
    }

    controller.abort();
    this.uploadTasks.delete(taskId);
  }
}

export function useMediaUploader(userId?: string) {
  const [uploader] = useState(() => new MediaUploader(userId || ""));
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const pickImage = async (config?: UploadConfig) => {
    if (!userId) throw new Error("User ID required");
    setUploading(true);
    setProgress(0);

    try {
      return await uploader.pickImage(config, (state) => {
        setProgress(state.progress);
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const takePhoto = async (config?: UploadConfig) => {
    if (!userId) throw new Error("User ID required");
    setUploading(true);
    setProgress(0);

    try {
      return await uploader.takePhoto(config, (state) => {
        setProgress(state.progress);
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const pickVideo = async () => {
    if (!userId) throw new Error("User ID required");
    setUploading(true);
    setProgress(0);

    try {
      return await uploader.pickVideo((state) => {
        setProgress(state.progress);
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const uploadDocument = async (uri: string, fileName: string) => {
    if (!userId) throw new Error("User ID required");
    setUploading(true);
    setProgress(0);

    try {
      return await uploader.uploadDocument(uri, fileName, (state) => {
        setProgress(state.progress);
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return {
    uploader,
    uploading,
    progress,
    pickImage,
    takePhoto,
    pickVideo,
    uploadDocument,
    deleteFile: async (storagePath: string) => uploader.deleteFile(storagePath),
    clearCache: () => uploader.clearCache(),
  };
}

export default MediaUploader;
