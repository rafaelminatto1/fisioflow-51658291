/**
 * File System Utilities
 * Helper functions for file operations
 */


/**
 * Get document directory
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';
import { log } from './logger';
import { asyncResult, Result } from './async';

export async function getDocumentDirectory(): Promise<Result<string>> {
  return asyncResult(async () => {
    const dir = FileSystem.documentDirectory;
    log.info('FS', 'Document directory accessed', { dir });
    return dir;
  }, 'getDocumentDirectory');
}

/**
 * Cache directory
 */
export async function getCacheDirectory(): Promise<Result<string>> {
  return asyncResult(async () => {
    const dir = FileSystem.cacheDirectory;
    log.info('FS', 'Cache directory accessed', { dir });
    return dir;
  }, 'getCacheDirectory');
}

/**
 * Read file as text
 */
export async function readFile(filePath: string): Promise<Result<string>> {
  return asyncResult(async () => {
    const content = await FileSystem.readAsStringAsync(filePath);
    log.info('FS', 'File read', { filePath, size: content.length });
    return content;
  }, 'readFile');
}

/**
 * Write text to file
 */
export async function writeFile(
  filePath: string,
  content: string
): Promise<Result<void>> {
  return asyncResult(async () => {
    const dir = FileSystem.documentDirectory;

    // Ensure directory exists
    const directory = filePath.split('/').slice(0, -1).join('/');
    const fullPath = `${dir}/${directory}`;

    await FileSystem.makeDirectoryAsync(fullPath, { intermediates: true });

    // Write file
    await FileSystem.writeAsStringAsync(fullPath, content);

    log.info('FS', 'File written', { filePath, size: content.length });
  }, 'writeFile');
}

/**
 * Delete file
 */
export async function deleteFile(filePath: string): Promise<Result<void>> {
  return asyncResult(async () => {
    const dir = FileSystem.documentDirectory;
    const fullPath = `${dir}/${filePath}`;

    const exists = await FileSystem.getInfoAsync(fullPath);
    if (exists.exists) {
      await FileSystem.deleteAsync(fullPath);
      log.info('FS', 'File deleted', { filePath });
    }
  }, 'deleteFile');
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const dir = FileSystem.documentDirectory;
    const fullPath = `${dir}/${filePath}`;
    const info = await FileSystem.getInfoAsync(fullPath);
    return info.exists;
  } catch {
    return false;
  }
}

/**
 * Pick a document
 */
export async function pickDocument(): Promise<Result<string | null>> {
  return asyncResult(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/plain', 'application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return null;
    }

    log.info('FS', 'Document picked', { uri: result.uri });
    return result.uri;
  }, 'pickDocument');
}

/**
 * Pick an image from gallery
 */
export async function pickImage(): Promise<Result<string | null>> {
  return asyncResult(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspectRatio: [4, 3],
    });

    if (result.canceled) {
      return null;
    }

    log.info('FS', 'Image picked', { uri: result.assets[0].uri });
    return result.assets[0].uri;
  }, 'pickImage');
}

/**
 * Take a photo
 */
export async function takePhoto(): Promise<Result<string | null>> {
  return asyncResult(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (permission.granted === false) {
      Alert.alert(
        'Permissão Necessária',
        'Precisamos de permissão para acessar a câmera.'
      );
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspectRatio: [4, 3],
    });

    if (result.canceled) {
      return null;
    }

    log.info('FS', 'Photo taken', { uri: result.assets[0].uri });
    return result.assets[0].uri;
  }, 'takePhoto');
}

/**
 * Share content
 */
export async function shareContent(
  message?: string,
  url?: string
): Promise<void> {
  try {
    if (!message && !url) {
      return;
    }

    await Sharing.shareAsync({
      message: url ? `${message}\n${url}` : message,
      url,
    });

    log.info('FS', 'Content shared');
  } catch (error) {
    log.error('FS', 'Share failed', error);
  }
}

/**
 * Open URL in external browser
 */
export async function openUrl(url: string): Promise<void> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      log.info('FS', 'URL opened', { url });
    } else {
      Alert.alert('Erro', 'Não foi possível abrir este link.');
    }
  } catch (error) {
    log.error('FS', 'Failed to open URL', error);
    Alert.alert('Erro', 'Não foi possível abrir este link.');
  }
}

/**
 * Get file size in human readable format
 */
export async function getFileSize(filePath: string): Promise<string | null> {
  try {
    const dir = FileSystem.documentDirectory;
    const fullPath = `${dir}/${filePath}`;
    const info = await FileSystem.getInfoAsync(fullPath);

    if (!info.exists) {
      return null;
    }

    const bytes = (info as FileSystem.FileInfo).size || 0;
    return formatBytes(bytes);
  } catch {
    return null;
  }
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Save file to downloads
 */
export async function saveToDownloads(
  filename: string,
  content: string
): Promise<Result<string>> {
  return asyncResult(async () => {
    const dir = FileSystem.documentDirectory;
    const downloadsDir = `${dir}/downloads`;

    // Ensure downloads directory exists
    await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });

    const filePath = `${downloadsDir}/${filename}`;
    await FileSystem.writeAsStringAsync(filePath, content);

    log.info('FS', 'File saved to downloads', { filename, size: content.length });
    return filePath;
  }, 'saveToDownloads');
}
