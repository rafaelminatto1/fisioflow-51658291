import { config } from '@/lib/config';
import { authApi } from '@/lib/auth-api';

/**
 * Upload de um arquivo para o Cloudflare R2 (via API)
 * @param uri URI local do arquivo
 * @param path Caminho no storage (ex: 'patients/123/photo.jpg')
 * @returns URL pública do arquivo
 */
export async function uploadFile(uri: string, path: string): Promise<string> {
  try {
    const token = await authApi.getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(uri);
    const blob = await response.blob();

    const formData = new FormData();
    // @ts-expect-error - React Native FormData accepts blob
    formData.append('file', {
        uri,
        name: path.split('/').pop() || 'file',
        type: blob.type || 'application/octet-stream',
    });
    formData.append('path', path);

    const uploadRes = await fetch(`${config.apiUrl}/api/storage/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!uploadRes.ok) {
        throw new Error(`Upload falhou: ${uploadRes.status}`);
    }

    const data = await uploadRes.json();
    return data.url;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Não foi possível fazer upload do arquivo');
  }
}

/**
 * Upload de uma foto para a evolução de um paciente
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
 */
export async function uploadPatientPhoto(patientId: string, uri: string): Promise<string> {
  const timestamp = Date.now();
  const path = `patients/${patientId}/profile_${timestamp}.jpg`;
  return uploadFile(uri, path);
}

/**
 * Upload de uma foto de perfil do profissional
 */
export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  const timestamp = Date.now();
  const path = `avatars/${userId}/profile_${timestamp}.jpg`;
  return uploadFile(uri, path);
}

/**
 * Upload de um anexo para o prontuário
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
 * Deleta um arquivo do Storage
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    const token = await authApi.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${config.apiUrl}/api/storage/delete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ path })
    });

    if (!res.ok) throw new Error('Failed to delete file');
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
 * Obtém a URL de download de um arquivo (se precisar assinar URL)
 * Como o Cloudflare R2 pode ser configurado com domínio público customizado,
 * podemos apenas retornar a URL ou pedir ao backend.
 */
export async function getFileUrl(path: string): Promise<string> {
  try {
    const token = await authApi.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${config.apiUrl}/api/storage/url?path=${encodeURIComponent(path)}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error('Failed to get url');
    const data = await res.json();
    return data.url;
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw new Error('Não foi possível obter a URL do arquivo');
  }
}
