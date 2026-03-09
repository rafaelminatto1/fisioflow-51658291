/**
 * Firebase Storage Integration — Bridge
 *
 * uploadFile → migrado para R2
 * getFirebaseStorage / ref / getDownloadURL — mantidos para leitura de
 * arquivos legados ainda no Firebase Storage (ex.: FileViewer).
 */
import {
  getStorage,
  ref,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import { getFirebaseApp } from './app';
import { uploadToR2 } from '@/lib/storage/r2-storage';

export const getFirebaseStorage = () => getStorage(getFirebaseApp());

/**
 * Upload de arquivo — agora usa R2.
 * O parâmetro `path` é usado como prefixo de pasta no R2.
 * Retorna a URL pública do arquivo no R2.
 */
export async function uploadFile(path: string, file: File | Blob): Promise<string> {
  const parts = path.split('/');
  // Usa tudo exceto o último segmento como folder no R2
  const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'uploads';
  const fileObj = file instanceof File ? file : new File([file], parts.at(-1) ?? 'file');
  const result = await uploadToR2(fileObj, folder);
  return result.url;
}

/**
 * Deletar arquivo do Firebase Storage (legado).
 */
export async function deleteFile(path: string): Promise<void> {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * Obter URL de arquivo legado no Firebase Storage.
 */
export async function getFileUrl(path: string): Promise<string> {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
}

// Exportações nativas necessárias para FileViewer (leitura de arquivos legados)
export { ref, getDownloadURL, listAll };
