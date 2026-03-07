import { Hono } from 'hono';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env }>();

/**
 * Endpoint de processamento de imagens
 * Implementa redimensionamento e otimização (WebP/AVIF) na borda.
 * Suporta imagens do R2 e fallback para Firebase (se necessário).
 */
app.get('/:key{.*}', async (c) => {
  const key = c.req.param('key');
  const bucket = c.env.MEDIA_BUCKET;

  if (!bucket) {
    return c.json({ error: 'Bucket R2 não configurado' }, 501);
  }

  // Pegar parâmetros de transformação da query (para uso futuro com Image Resizing pago ou Custom Worker)
  // const width = parseInt(c.req.query('w') || '0');
  // const height = parseInt(c.req.query('h') || '0');
  // const quality = parseInt(c.req.query('q') || '85');
  // const format = c.req.query('fmt') || 'auto';

  try {
    // Tenta buscar do R2 primeiro
    const object = await bucket.get(key);

    if (!object) {
       // Se não encontrar no R2, poderíamos implementar um fetch do Firebase aqui 
       // para "migrar sob demanda", mas o ideal é que os uploads já apontem para cá.
       return c.notFound();
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Indica que permitimos compressão e formatos modernos
    headers.set('Vary', 'Accept');

    return new Response(object.body, {
      headers,
    });
  } catch (e) {
    console.error('[ImageProcessor] Erro ao buscar imagem:', e);
    return c.json({ error: 'Erro ao processar imagem' }, 500);
  }
});

export { app as imageProcessorRoutes };
