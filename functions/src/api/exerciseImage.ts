/**
 * Cloud Function to proxy exercise images from Firebase Storage
 * This bypasses CORS issues and provides a reliable way to serve images
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';
import { CORS_ORIGINS } from '../init';

type OutputFormat = 'avif' | 'webp' | 'jpeg' | 'png';

const ALLOWED_PREFIXES = ['exercise-media/', 'exercise-videos/'];
const DEFAULT_QUALITY: Record<OutputFormat, number> = {
  avif: 55,
  webp: 70,
  jpeg: 72,
  png: 80,
};
const CONTENT_TYPES: Record<OutputFormat, string> = {
  avif: 'image/avif',
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

function clampNumber(value: number | undefined, min: number, max: number): number | undefined {
  if (value === undefined || Number.isNaN(value)) return undefined;
  return Math.min(Math.max(value, min), max);
}

function parseDimension(raw: unknown): number | undefined {
  if (!raw) return undefined;
  const parsed = Number(raw);
  return clampNumber(Math.round(parsed), 16, 4096);
}

function parseDpr(raw: unknown): number {
  const parsed = Number(raw);
  return clampNumber(parsed, 1, 3) ?? 1;
}

function detectFormatFromExtension(ext?: string): OutputFormat {
  switch ((ext || '').toLowerCase()) {
    case 'avif':
      return 'avif';
    case 'webp':
      return 'webp';
    case 'png':
      return 'png';
    default:
      return 'jpeg';
  }
}

function chooseFormat(formatParam: string | undefined, acceptHeader: string, fallback: OutputFormat): OutputFormat {
  const param = (formatParam || 'original').toLowerCase();

  if (param === 'avif' || param === 'webp' || param === 'jpeg' || param === 'jpg' || param === 'png') {
    return param === 'jpg' ? 'jpeg' : (param as OutputFormat);
  }

  if (param !== 'auto') {
    return fallback;
  }

  const accept = acceptHeader.toLowerCase();
  if (accept.includes('image/avif')) return 'avif';
  if (accept.includes('image/webp')) return 'webp';
  return fallback;
}

export const exerciseImageProxy = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
    cors: CORS_ORIGINS,
    invoker: 'public',
  },
  async (request, response) => {
    // Set CORS headers
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year cache

    // Handle OPTIONS preflight request
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    // Only GET requests allowed
    if (request.method !== 'GET') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    try {
      // Extract image path from URL: /api/exercise-image/{path}
      // The path can be either:
      // - id/filename (new format, without exercise-media prefix)
      // - exercise-media/id/filename (old format, with prefix)
      const fullPath = request.path || '';
      console.log('Exercise image proxy - fullPath:', fullPath);

      const pathSegment = fullPath.replace('/api/exercise-image/', '');
      console.log('Exercise image proxy - pathSegment:', pathSegment);

      if (!pathSegment) {
        response.status(400).send('Bad Request: Missing image path');
        return;
      }

      // Decode the path if it's URL-encoded
      let decodedPath: string;
      try {
        decodedPath = decodeURIComponent(pathSegment);
        // If still encoded, decode again
        if (decodedPath.includes('%')) {
          decodedPath = decodeURIComponent(decodedPath);
        }
      } catch {
        decodedPath = pathSegment;
      }

      console.log('Exercise image proxy - decodedPath:', decodedPath);

      // Ensure the path starts with an allowed prefix
      let imagePath: string;
      if (ALLOWED_PREFIXES.some((prefix) => decodedPath.startsWith(prefix))) {
        imagePath = decodedPath;
      } else {
        // Default to exercise-media prefix
        imagePath = 'exercise-media/' + decodedPath;
      }

      // Basic path traversal guard
      if (imagePath.includes('..')) {
        response.status(400).send('Bad Request');
        return;
      }

      console.log('Exercise image proxy - imagePath:', imagePath);

      // Get the bucket
      const bucketName = process.env.STORAGE_BUCKET_NAME || 'fisioflow-migration.firebasestorage.app';
      console.log('Exercise image proxy - bucketName:', bucketName);
      const bucket = getStorage().bucket(`gs://${bucketName}`);

      // Get the file
      const file = bucket.file(imagePath);
      console.log('Exercise image proxy - file path:', imagePath);

      // Check if file exists
      const [exists] = await file.exists();
      console.log('Exercise image proxy - file exists:', exists);
      if (!exists) {
        console.log('Exercise image proxy - file not found:', imagePath);
        response.status(404).send('Not Found');
        return;
      }

      // --- Image optimization parameters ---
      const { w, h, dpr: dprRaw, fmt, fit } = request.query;
      const width = parseDimension(w);
      const height = parseDimension(h);
      const dpr = parseDpr(dprRaw);
      const fitMode = (typeof fit === 'string' && ['cover', 'contain', 'inside', 'outside', 'fill'].includes(fit)
        ? fit
        : 'cover') as keyof sharp.FitEnum;

      const extension = imagePath.split('.').pop();
      const fallbackFormat = detectFormatFromExtension(extension);
      const outputFormat = chooseFormat(typeof fmt === 'string' ? fmt : undefined, request.get('accept') || '', fallbackFormat);
      const quality = clampNumber(
        Number(request.query.q),
        30,
        95
      ) ?? DEFAULT_QUALITY[outputFormat];

      // If SVG or no transforms requested, stream original
      const isSvg = (extension || '').toLowerCase() === 'svg';
      const shouldTransform = !isSvg && (width || height || outputFormat !== fallbackFormat);

      if (!shouldTransform) {
        response.set('Content-Type', CONTENT_TYPES[outputFormat] || 'image/png');
        const stream = file.createReadStream();
        stream.pipe(response);
        stream.on('error', (error) => {
          console.error('Error streaming image:', error);
          if (!response.headersSent) {
            response.status(500).send('Internal Server Error');
          }
        });
        return;
      }

      // Download original and transform with sharp
      const [buffer] = await file.download();
      const transformer = sharp(buffer).rotate();

      if (width || height) {
        transformer.resize({
          width: width ? Math.round(width * dpr) : undefined,
          height: height ? Math.round(height * dpr) : undefined,
          fit: fitMode,
          withoutEnlargement: true,
        });
      }

      switch (outputFormat) {
        case 'avif':
          transformer.avif({ quality, effort: 4 });
          break;
        case 'webp':
          transformer.webp({ quality });
          break;
        case 'jpeg':
          transformer.jpeg({ quality, mozjpeg: true });
          break;
        case 'png':
        default:
          transformer.png({ compressionLevel: 9, quality });
          break;
      }

      const optimizedBuffer = await transformer.toBuffer();
      response.set('Content-Type', CONTENT_TYPES[outputFormat]);
      response.send(optimizedBuffer);

    } catch (error) {
      console.error('Error serving exercise image:', error);
      if (!response.headersSent) {
        response.status(500).send('Internal Server Error');
      }
    }
  }
);

/**
 * Helper function to convert Firebase Storage URL to proxy URL
 * @param storageUrl - The Firebase Storage URL
 * @returns The proxy URL
 */
export function toProxyUrl(storageUrl: string): string {
  try {
    // Parse Firebase Storage URL
    // Format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media
    const url = new URL(storageUrl);
    const pathMatch = url.pathname.match(/\/o\/([^?]+)/);

    if (pathMatch) {
      const encodedPath = pathMatch[1];
      // In production: https://moocafisio.com.br/api/exercise-image/{path}
      // In dev: http://localhost:5001/{project}/us-central1/exerciseImageProxy
      return `/api/exercise-image/${encodedPath}`;
    }

    return storageUrl;
  } catch {
    return storageUrl;
  }
}
