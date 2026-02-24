/**
 * Cloud Storage Image Optimization
 *
 * Otimiza automaticamente imagens enviadas ao Cloud Storage para economizar espaço e melhorar performance.
 * Free Tier: 5GB/mês de armazenamento gratuito
 *
 * Features:
 * - Compressão automática de imagens
 * - Conversão para WebP (mais eficiente)
 * - Redimensionamento inteligente
 * - Geração de thumbnails
 */

import { onObjectFinalized } from 'firebase-functions/v2/storage';
import * as admin from 'firebase-admin';
import sharp from 'sharp';
import { logger } from '../lib/logger';
import { path } from '../lib/path-compat';

// Configurações
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const QUALITY = 80;
const THUMBNAIL_WIDTH = 200;

/**
 * Trigger disparado quando um novo arquivo é finalizado no storage
 */
export const optimizeImageOnUpload = onObjectFinalized(
  {
    region: 'southamerica-east1',
    memory: '1GiB', // Sharp exige memória para processar
    cpu: 1,
  },
  async (event) => {
    const file = event.data;
    const bucket = admin.storage().bucket(file.bucket);
    const filePath = file.name;

    // Verificar se é uma imagem
    if (!file.contentType?.startsWith('image/')) {
      return;
    }

    // Evitar loop infinito (não processar o que já foi otimizado)
    if (file.metadata?.optimized === 'true' || filePath.includes('_thumb.')) {
      return;
    }

    logger.info('[ImageOptimization] Otimizando imagem', { filePath });

    try {
      // Download da imagem
      const [buffer] = await bucket.file(filePath).download();

      // Otimizar imagem principal (WebP)
      const optimizedBuffer = await sharp(buffer)
        .resize(MAX_WIDTH, MAX_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: QUALITY })
        .toBuffer();

      // Gerar thumbnail
      const thumbBuffer = await sharp(buffer)
        .resize(THUMBNAIL_WIDTH, THUMBNAIL_WIDTH, {
          fit: 'cover',
        })
        .webp({ quality: QUALITY })
        .toBuffer();

      const fileName = path.basename(filePath);
      const fileDir = path.dirname(filePath);
      const thumbPath = path.join(fileDir, `${fileName.split('.')[0]}_thumb.webp`);

      // Sobrescreve a imagem original com a versão otimizada WebP
      // Mantemos o nome original (ex: foto.jpg) mas o conteúdo é WebP
      // Os navegadores interpretam corretamente via Content-Type
      await Promise.all([
        // Imagem otimizada (sobrescrevendo original)
        bucket.file(filePath).save(optimizedBuffer, {
          contentType: 'image/webp',
          metadata: {
            optimized: 'true',
            format: 'webp',
          },
        }),
        // Thumbnail (sempre .webp para clareza)
        bucket.file(thumbPath).save(thumbBuffer, {
          contentType: 'image/webp',
          metadata: {
            isThumbnail: 'true',
            parentImage: filePath,
          },
        })
      ]);

      logger.info('[ImageOptimization] Sucesso', { filePath, thumbPath });
    } catch (error) {
      logger.error('[ImageOptimization] Erro ao otimizar', { filePath, error });
    }
  }
);

/**
 * Limpeza periódica de imagens antigas ou órfãs
 */
export const cleanupOldImages = async () => {
  // Implementação opcional para rodar via Scheduler
};

export const cleanupOrphanThumbnails = async () => {
  // Implementação opcional
};

export const getOptimizationStats = async () => {
  return {
    status: 'active',
    savings_estimated: '60-80%',
  };
};
