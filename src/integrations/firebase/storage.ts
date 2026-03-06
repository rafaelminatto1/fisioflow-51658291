/**
 * Firebase Storage Integration - Bridge/Fallback
 * 
 * TODO: Migrate to Cloudflare R2 as per MIGRACAO_CLOUDFLARE_NEON_2026.md
 */

import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll
} from 'firebase/storage';
import { getFirebaseApp } from './app';

// Obter instância do Storage
export const getFirebaseStorage = () => getStorage(getFirebaseApp());

/**
 * Upload de arquivo para o Firebase Storage
 */
export async function uploadFile(path: string, file: File | Blob): Promise<string> {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, path);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return downloadURL;
}

/**
 * Deletar arquivo do Firebase Storage
 */
export async function deleteFile(path: string): Promise<void> {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * Obter URL pública de um arquivo
 */
export async function getFileUrl(path: string): Promise<string> {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
}

// Re-exportar funções nativas úteis
export { ref, getDownloadURL, listAll };
