import { getNeonAccessToken } from '@/lib/auth/neon-token';

const API_URL = import.meta.env.VITE_WORKERS_API_URL || 'https://fisioflow-api.rafalegollas.workers.dev';

export interface R2UploadResult {
    url: string;
    path: string;
    name: string;
    size: number;
    contentType: string;
    createdAt: Date;
}

export interface UploadOptions {
    onProgress?: (progress: number) => void;
    contentType?: string;
}

/**
 * Faz upload de um arquivo para o Cloudflare R2 usando URLs pré-assinadas via Workers API.
 * @param file O arquivo a ser upado
 * @param folder A pasta de destino no bucket
 * @param options Opções adicionais como onProgress para acompanhar o progresso
 */
export async function uploadToR2(
    file: File,
    folder: string,
    options?: UploadOptions
): Promise<R2UploadResult> {
    const token = await getNeonAccessToken();

    // 1. Solicita a Pre-Signed URL ao Worker
    const res = await fetch(`${API_URL}/api/media/upload-url`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            folder
        })
    });

    if (!res.ok) {
        let errorMsg = 'Falha ao solicitar URL de upload';
        try {
            const errorData = await res.json();
            errorMsg = errorData.error || errorMsg;
        } catch (e) {
            // ignora
        }
        throw new Error(errorMsg);
    }

    const result = await res.json();
    const { uploadUrl, publicUrl, key } = result.data;

    // 2. Faz o upload direto pro servidor de armazenamento (R2) usando XMLHttpRequest para ter progresso
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && options?.onProgress) {
                const progress = (event.loaded / event.total) * 100;
                options.onProgress(progress);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve({
                    url: publicUrl,
                    path: key,
                    name: file.name,
                    size: file.size,
                    contentType: file.type || 'application/octet-stream',
                    createdAt: new Date()
                });
            } else {
                reject(new Error('Falha ao enviar o arquivo para o R2'));
            }
        };

        xhr.onerror = () => {
            reject(new Error('Erro de rede ao enviar o arquivo para o R2'));
        };

        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.setRequestHeader('Cache-Control', 'public, max-age=31536000, immutable');
        xhr.send(file);
    });
}

/**
 * Remove um arquivo no bucket R2.
 * Note que a key deve conter o ID do usuário para bater com a regra de segurança do worker.
 */
export async function deleteFromR2(key: string): Promise<void> {
    const token = await getNeonAccessToken();
    const encodedKey = encodeURIComponent(key);

    const res = await fetch(`${API_URL}/api/media/${encodedKey}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) {
        let errorMsg = 'Falha ao excluir arquivo do R2';
        try {
            const errorData = await res.json();
            errorMsg = errorData.error || errorMsg;
        } catch (e) {
            // ignora
        }
        throw new Error(errorMsg);
    }
}
