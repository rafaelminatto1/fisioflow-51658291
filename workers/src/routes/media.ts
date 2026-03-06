import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Tipos suportados
const ALLOWED_TYPES: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
};

// ===== ROTA DE UPLOAD (Pre-Signed URL) =====
app.post('/upload-url', requireAuth, async (c) => {
    try {
        const body = await c.req.json();
        const { filename, contentType, folder = 'uploads' } = body;

        if (!contentType || !ALLOWED_TYPES[contentType]) {
            return c.json({
                error: 'Tipo de arquivo não suportado',
                allowed: Object.keys(ALLOWED_TYPES)
            }, 400);
        }

        const user = c.get('user');
        const userId = user?.uid || 'anonymous';

        // Segurança contra path traversal
        const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
        const ext = ALLOWED_TYPES[contentType];
        const timestamp = new Date().toISOString().split('T')[0]; // yyyy-MM-dd
        const keyId = uuidv4();

        // Caminho no bucket: pasta/ano-mes-dia/id_user/uuid.extensão
        const key = `${safeFolder}/${timestamp}/${userId}/${keyId}${ext}`;

        const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${c.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: c.env.R2_ACCESS_KEY_ID,
                secretAccessKey: c.env.R2_SECRET_ACCESS_KEY,
            },
        });

        const command = new PutObjectCommand({
            Bucket: 'fisioflow-media',
            Key: key,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable',
        });

        // Gera o link para o client subir o arquivo diretamente com validade de 10 minutos
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });
        const publicUrl = `${c.env.R2_PUBLIC_URL}/${key}`;

        return c.json({
            data: {
                uploadUrl: signedUrl,
                publicUrl,
                key,
                expiresIn: 600
            }
        });
    } catch (error) {
        console.error('[Media] Erro ao gerar upload URL:', error);
        return c.json({ error: 'Falha ao gerar URL de upload' }, 500);
    }
});

// ===== ROTA DE EXCLUSÃO DE ARQUIVO (Apenas Donos ou Admin) =====
app.delete('/:key{.*}', requireAuth, async (c) => {
    try {
        const key = c.req.param('key');
        const user = c.get('user');

        if (!key) {
            return c.json({ error: 'Chave não informada' }, 400);
        }

        // Regra simples: A key contem o UID do criador no path, como folder/date/userId/...
        // Se o usuário não for dono do arquivo (e a gente não tiver um role de admin explicito), proibir.
        if (!key.includes(`/${user.uid}/`)) {
            return c.json({ error: 'Acesso negado para remover este arquivo' }, 403);
        }

        // Deleta o arquivo via S3 API usando o R2_BUCKET compatível
        const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${c.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: c.env.R2_ACCESS_KEY_ID,
                secretAccessKey: c.env.R2_SECRET_ACCESS_KEY,
            },
        });

        const command = new DeleteObjectCommand({
            Bucket: 'fisioflow-media',
            Key: key,
        });

        await s3Client.send(command);

        return c.json({ ok: true, message: 'Arquivo deletado com sucesso' });
    } catch (error) {
        console.error('[Media] Erro ao excluir arquivo:', error);
        return c.json({ error: 'Falha ao excluir o arquivo' }, 500);
    }
});

export { app as mediaRoutes };
