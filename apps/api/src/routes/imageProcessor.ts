import { Hono } from 'hono';
import type { Env } from '../types/env';
import { getResizedImage } from '../lib/images';

const app = new Hono<{ Bindings: Env }>();

/**
 * Endpoint de processamento de imagens
 * Implementa redimensionamento e otimização (WebP/AVIF) na borda via Cloudflare Images.
 */
app.get('/:key{.*}', async (c) => {
  const key = c.req.param('key');
  const bucket = c.env.MEDIA_BUCKET;

  if (!bucket) {
    return c.json({ error: 'Bucket R2 não configurado' }, 501);
  }

  // Parâmetros de transformação da query string (Ex: ?w=200&h=200&fit=cover)
  const width = parseInt(c.req.query('w') || '0');
  const height = parseInt(c.req.query('h') || '0');
  const quality = parseInt(c.req.query('q') || '85');
  const fit = (c.req.query('fit') as any) || 'scale-down';

  try {
    // 1. Verificar se a imagem existe no R2
    const object = await bucket.get(key);
    if (!object) return c.notFound();

    // 2. Se não houver parâmetros de redimensionamento, servir original
    if (!width && !height) {
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
      
      // Garantir Content-Type se estiver ausente
      if (!headers.has('Content-Type')) {
        const ext = key.split('.').pop()?.toLowerCase();
        if (ext === 'avif') headers.set('Content-Type', 'image/avif');
        else if (ext === 'webp') headers.set('Content-Type', 'image/webp');
        else if (ext === 'png') headers.set('Content-Type', 'image/png');
        else if (ext === 'jpg' || ext === 'jpeg') headers.set('Content-Type', 'image/jpeg');
      }

      return new Response(object.body, { headers });
    }

    // 3. Usar utilitário de redimensionamento
    return getResizedImage(c.env, c.req.url, {
      width: width > 0 ? width : undefined,
      height: height > 0 ? height : undefined,
      fit,
      quality,
    });
  } catch (e) {
    console.error('[ImageProcessor] Erro ao buscar imagem:', e);
    return c.json({ error: 'Erro ao processar imagem' }, 500);
  }
});

export { app as imageProcessorRoutes };
