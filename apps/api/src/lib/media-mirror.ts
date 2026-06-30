import type { Env } from "../types/env";

const GRAPH = "https://graph.facebook.com/v25.0";

/** Extensão de arquivo a partir do content-type (para a chave no R2). */
export function extFromContentType(ct: string): string {
  const t = (ct || "").toLowerCase();
  if (t.includes("jpeg") || t.includes("jpg")) return ".jpg";
  if (t.includes("png")) return ".png";
  if (t.includes("webp")) return ".webp";
  if (t.includes("gif")) return ".gif";
  if (t.includes("mp4")) return ".mp4";
  if (t.includes("3gpp") || t.includes("3gp")) return ".3gp";
  if (t.includes("ogg") || t.includes("opus")) return ".ogg";
  if (t.includes("mpeg") || t.includes("mp3")) return ".mp3";
  if (t.includes("amr")) return ".amr";
  if (t.includes("aac")) return ".aac";
  if (t.includes("pdf")) return ".pdf";
  return "";
}

/**
 * Baixa uma URL efêmera (CDN da Meta/Instagram, que expira) e espelha no R2,
 * retornando a URL pública estável (media.moocafisio.com.br). Degrada
 * graciosamente: em qualquer falha, retorna a URL de origem.
 */
export async function mirrorToR2(
  env: Env,
  sourceUrl: string | undefined,
  keyPrefix: string,
  authToken?: string,
): Promise<string | undefined> {
  if (!sourceUrl) return sourceUrl;
  const publicBase = env.R2_PUBLIC_URL;
  if (!env.MEDIA_BUCKET || !publicBase) return sourceUrl;
  // Já está no nosso domínio — não re-espelha.
  if (sourceUrl.startsWith(publicBase)) return sourceUrl;

  try {
    const headers: Record<string, string> = {};
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const res = await fetch(sourceUrl, { headers });
    if (!res.ok) return sourceUrl;

    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const key = `${keyPrefix}/${crypto.randomUUID()}${extFromContentType(contentType)}`;
    const body = await res.arrayBuffer();
    await env.MEDIA_BUCKET.put(key, body, {
      httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
    });
    return `${publicBase}/${key}`;
  } catch (err) {
    console.warn("[media-mirror] falhou, usando URL de origem:", err);
    return sourceUrl;
  }
}

/**
 * Resolve um media_id do WhatsApp (Graph) e espelha os bytes no R2.
 * Retorna a URL pública + content-type, ou null se não conseguir.
 */
export async function mirrorWhatsAppMedia(
  env: Env,
  mediaId: string | undefined,
): Promise<{ url: string; contentType?: string } | null> {
  const token = env.WHATSAPP_ACCESS_TOKEN;
  if (!mediaId || !token) return null;
  try {
    const metaRes = await fetch(`${GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) return null;
    const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
    if (!meta.url) return null;
    const mirrored = await mirrorToR2(env, meta.url, "crm/whatsapp/media", token);
    if (!mirrored) return null;
    return { url: mirrored, contentType: meta.mime_type };
  } catch (err) {
    console.warn("[media-mirror] mirrorWhatsAppMedia falhou:", err);
    return null;
  }
}
