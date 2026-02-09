import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload de um arquivo para o Firebase Storage
 * @param uri URI local do arquivo
 * @param path Caminho no storage (ex: 'patients/123/photo.jpg')
 * @returns URL pública do arquivo
 */
export async function uploadFile(uri: string, path: string): Promise<string> {
  try {
    // Convert URI to Blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Create a reference to the file location
    const storageRef = ref(storage, path);

    // Upload the file
    await uploadBytes(storageRef, blob);

    // Get the public URL
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Não foi possível fazer upload do arquivo');
  }
}

/**
 * Upload de uma foto para a evolução de um paciente
 * @param patientId ID do paciente
 * @param evolutionId ID da evolução
 * @param uri URI local da foto
 * @param fileName Nome do arquivo
 * @returns URL pública da foto
 */
export async function uploadEvolutionPhoto(
  patientId: string,
  evolutionId: string,
  uri: string,
  fileName: string
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.]/g, '_');
  const path = `evolutions/${patientId}/${evolutionId}/${timestamp}_${sanitizedFileName}`;
  return uploadFile(uri, path);
}

/**
 * Upload de uma foto de perfil do paciente
 * @param patientId ID do paciente
 * @param uri URI local da foto
 * @returns URL pública da foto
 */
export async function uploadPatientPhoto(patientId: string, uri: string): Promise<string> {
  const timestamp = Date.now();
  const path = `patients/${patientId}/profile_${timestamp}.jpg`;
  return uploadFile(uri, path);
}

/**
 * Upload de um anexo para o prontuário
 * @param patientId ID do paciente
 * @param uri URI local do arquivo
 * @param fileName Nome do arquivo
 * @returns URL pública do arquivo
 */
export async function uploadPatientAttachment(
  patientId: string,
  uri: string,
  fileName: string
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.]/g, '_');
  const path = `patients/${patientId}/attachments/${timestamp}_${sanitizedFileName}`;
  return uploadFile(uri, path);
}

/**
 * Deleta um arquivo do Firebase Storage
 * @param path Caminho do arquivo no storage
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Não foi possível deletar o arquivo');
  }
}

/**
 * Deleta uma foto de evolução
 */
export async function deleteEvolutionPhoto(
  patientId: string,
  evolutionId: string,
  fileName: string
): Promise<void> {
  const path = `evolutions/${patientId}/${evolutionId}/${fileName}`;
  return deleteFile(path);
}

/**
 * Obtém a URL de download de um arquivo
 * @param path Caminho do arquivo no storage
 * @returns URL pública
 */
export async function getFileUrl(path: string): Promise<string> {
  try {
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw new Error('Não foi possível obter a URL do arquivo');
  }
}
