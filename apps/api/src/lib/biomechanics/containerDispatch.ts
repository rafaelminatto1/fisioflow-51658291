/**
 * Despacho e retorno do container de pose.
 *
 * O Worker nunca faz o vídeo passar por si: gera uma URL assinada de leitura
 * do R2 e outra de escrita para o resultado, e o container fala direto com o
 * storage. Streamar PHI através do Worker gastaria CPU e memória para não
 * ganhar nada.
 *
 * O container é tratado como não confiável para autenticação: o callback traz
 * um token HMAC com validade, e o Worker só age depois de conferi-lo.
 */

import { R2Service } from "../storage/R2Service";
import type { Env } from "../../types/env";

/** Janela do token de callback. Uma extração longa cabe folgada aqui. */
const CALLBACK_TTL_SECONDS = 3600;

export interface ContainerDispatchInput {
  jobId: string;
  assessmentId: string;
  organizationId: string;
  patientId: string;
  mediaId: string;
  videoKey: string;
  resultKey: string;
  view: string;
  attempt: number;
  protocolSlug?: string | null;
  capturedAt?: string | null;
  apiBaseUrl: string;
}

export async function signCallbackToken(
  secret: string,
  jobId: string,
  assessmentId: string,
  expiresAt: number,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const message = `${jobId}|${assessmentId}|${expiresAt}`;
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${expiresAt}.${hex}`;
}

export async function verifyCallbackToken(
  secret: string,
  token: string,
  jobId: string,
  assessmentId: string,
  nowMs: number,
): Promise<boolean> {
  const [expiresRaw, provided] = token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || !provided) return false;
  if (expiresAt * 1000 < nowMs) return false;

  const expected = await signCallbackToken(secret, jobId, assessmentId, expiresAt);
  const [, expectedHex] = expected.split(".");

  // Comparação de tempo constante: um early-return no primeiro byte diferente
  // vaza o prefixo correto por temporização.
  if (expectedHex.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    diff |= expectedHex.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Entrega o trabalho ao container. Ele responde 202 na hora e avisa por
 * callback quando termina — a extração leva de dezenas de segundos a minutos,
 * muito além de qualquer timeout razoável de requisição.
 */
export async function dispatchToPoseContainer(
  env: Env,
  input: ContainerDispatchInput,
): Promise<{ dispatched: boolean; reason?: string }> {
  if (!env.BIOMECHANICS_POSE) {
    return { dispatched: false, reason: "container_binding_missing" };
  }
  if (!env.BIOMECHANICS_CALLBACK_SECRET) {
    // Sem segredo o callback seria aberto: qualquer um poderia declarar um
    // job como concluído e injetar landmarks arbitrários num laudo.
    return { dispatched: false, reason: "callback_secret_missing" };
  }

  const r2 = new R2Service(env);
  const videoUrl = await r2.getDownloadUrl(input.videoKey, 900);
  const resultPutUrl = await r2.getUploadUrl(input.resultKey, "application/x-ndjson");

  const expiresAt = Math.floor(Date.now() / 1000) + CALLBACK_TTL_SECONDS;
  const callbackToken = await signCallbackToken(
    env.BIOMECHANICS_CALLBACK_SECRET,
    input.jobId,
    input.assessmentId,
    expiresAt,
  );

  // Uma instância por job: o próprio id deduplica, então dois pedidos para o
  // mesmo job não viram duas extrações.
  const id = env.BIOMECHANICS_POSE.idFromName(`bio-pose-${input.jobId}`);
  const stub = env.BIOMECHANICS_POSE.get(id);

  const response = await stub.fetch("http://container/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId: input.jobId,
      assessmentId: input.assessmentId,
      videoUrl,
      resultPutUrl,
      resultKey: input.resultKey,
      view: input.view,
      attempt: input.attempt,
      protocolSlug: input.protocolSlug ?? undefined,
      capturedAt: input.capturedAt ?? undefined,
      callbackUrl: `${input.apiBaseUrl}/api/biomechanics/internal/jobs/${input.jobId}/pose-callback`,
      callbackToken,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return { dispatched: false, reason: `container_rejected_${response.status}:${detail.slice(0, 200)}` };
  }

  return { dispatched: true };
}
