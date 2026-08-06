import { fetchApi } from "@/lib/api";

/**
 * Upload para o R2 pelo fluxo de URL pré-assinada do Worker.
 *
 * Até 08/2026 este módulo fazia `POST multipart` em `/api/storage/upload`, rota que
 * não existe (404): todo upload de avatar e de foto de evolução falhava. O Worker
 * expõe `POST /api/media/upload-url`, que devolve uma URL assinada para um PUT
 * direto no bucket — é o mesmo fluxo que a tela de exercícios e o app web já usam.
 *
 * O Worker monta a chave final (`pasta/data/usuário/uuid.ext`) e ignora caminho
 * vindo do cliente, então o que passamos é a PASTA, não o caminho completo.
 */

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
] as const;

interface UploadUrlResponse {
  data?: {
    uploadUrl?: string;
    publicUrl?: string;
    key?: string;
  };
}

function guessContentType(uri: string, fallback = "image/jpeg"): string {
  const ext = uri.split("?")[0].split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    default:
      return fallback;
  }
}

/**
 * Sobe um arquivo local e devolve a URL pública.
 * @param uri URI local (file://, content://, data:)
 * @param folder Pasta lógica no bucket (ex.: 'avatars', 'evolutions')
 */
export async function uploadToR2(
  uri: string,
  folder: string,
  contentType?: string,
): Promise<string> {
  const resolvedType = contentType || guessContentType(uri);

  if (!ALLOWED_CONTENT_TYPES.includes(resolvedType as (typeof ALLOWED_CONTENT_TYPES)[number])) {
    throw new Error(`Tipo de arquivo não suportado: ${resolvedType}`);
  }

  const response = await fetchApi<UploadUrlResponse>("/api/media/upload-url", {
    method: "POST",
    data: { contentType: resolvedType, folder },
  });

  const uploadUrl = response.data?.uploadUrl;
  const publicUrl = response.data?.publicUrl;
  if (!uploadUrl || !publicUrl) {
    throw new Error("Servidor não devolveu a URL de upload");
  }

  const file = await fetch(uri);
  const blob = await file.blob();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": resolvedType },
  });

  if (!putRes.ok) {
    throw new Error(`Upload falhou: ${putRes.status}`);
  }

  return publicUrl;
}

/** @deprecated Use `uploadToR2`. O segundo argumento agora é a pasta, não o caminho. */
export async function uploadFile(uri: string, pathOrFolder: string): Promise<string> {
  const folder = pathOrFolder.split("/")[0] || "uploads";
  return uploadToR2(uri, folder);
}

export async function uploadEvolutionPhoto(
  _patientId: string,
  _evolutionId: string,
  uri: string,
  _fileName: string,
): Promise<string> {
  return uploadToR2(uri, "evolutions");
}

export async function uploadPatientPhoto(_patientId: string, uri: string): Promise<string> {
  return uploadToR2(uri, "patients");
}

export async function uploadAvatar(_userId: string, uri: string): Promise<string> {
  return uploadToR2(uri, "avatars");
}

export async function uploadPatientAttachment(
  _patientId: string,
  uri: string,
  _fileName: string,
): Promise<string> {
  return uploadToR2(uri, "patients");
}

/**
 * Remove um arquivo do bucket. A rota exige a CHAVE devolvida no upload
 * (`DELETE /api/media/:key`) e só autoriza chaves do próprio usuário.
 */
export async function deleteFile(key: string): Promise<void> {
  await fetchApi(`/api/media/${key.split("/").map(encodeURIComponent).join("/")}`, {
    method: "DELETE",
  });
}
