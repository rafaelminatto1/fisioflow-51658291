import type { Env } from "./types/env";
import { createPool, createPoolForOrg, getRawSql, runWithOrg, createDb } from "./lib/db";
import { appointments, patients } from "@fisioflow/db";
import { eq } from "drizzle-orm";
import { runAutomationsForEvent } from "./lib/automation/triggerAutomations";
import { writeEvent } from "./lib/analytics";
import { transcribeAudio, analyzeClinicImage } from "./lib/ai-native";
import { sendPushToUser, sendPushToOrg, type PushPayload } from "./lib/webpush";
import { buildHtml, generatePdfQuickAction } from "./routes/reportsPdf";
import { R2Service } from "./lib/storage/R2Service";
import { sendPrescriptionEmail } from "./lib/email";
import { sendAutomationTemplate } from "./lib/whatsappAutomations";
import type { AutomationTemplateKey } from "./lib/whatsappAutomationTemplates";
import { reindexKbItem, type ReindexKbItemPayload } from "./lib/kbReindex";
import { backoffDelay } from "./lib/queueBackoff";
import { resolveOrCreateContact } from "./lib/whatsapp-identity";
import { findOrCreateConversation, addMessage } from "./lib/whatsapp-conversations";
import { broadcastToOrg } from "./lib/realtime";
import { syncNoteToSemanticIndex } from "./lib/notesIndexing";
import {
  computeAssessmentMetrics,
  decodePoseBundle,
  KINEMATICS_VERSION,
  type BundleHeader,
  type LandmarkFrame,
} from "@fisioflow/core";

export type WhatsAppQueuePayload = {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParameters: Array<{ type: "text"; text: string }>;
  organizationId: string;
  patientId: string;
  messageText: string;
  appointmentId: string;
  /**
   * Mensagens INICIADAS pela clínica (lembrete, confirmação) devem ir por
   * template primeiro. Fora da janela de 24h a Meta aceita o texto livre (HTTP
   * 200) mas falha a entrega depois (erro 131047), então o texto-livre-primeiro
   * nunca entregava a esses pacientes. Com o flag, manda o template primeiro.
   */
  preferTemplate?: boolean;
};

export type R2NotificationPayload = {
  action: "PutObject" | "DeleteObject" | "CopyObject";
  bucket: string;
  key: string;
  size?: number;
  eTag?: string;
  organizationId?: string;
  patientId?: string;
  contentType?: string;
};

export type ExamProcessPayload = {
  examId: string;
  r2Key: string;
  organizationId: string;
  patientId: string;
  fileType: "image" | "audio" | "pdf";
};

export type TTSPayload = {
  text: string;
  voice?: string;
  r2Key: string; // onde salvar o áudio gerado
  organizationId: string;
};

export type WorkflowTriggerPayload = {
  workflowType:
    | "appointment-reminder"
    | "patient-onboarding"
    | "nfse"
    | "hep-compliance"
    | "discharge"
    | "reengagement";
  params: Record<string, unknown>;
  organizationId: string;
};

export type BiomechanicsProcessPayload = {
  jobId: string;
  assessmentId: string;
  mediaId?: string;
  organizationId: string;
  patientId: string;
  /** 'device' = landmarks do aparelho; 'container' = reprocessamento em nuvem. */
  phase?: "device" | "container";
};

type GenerateNFSePayload = {
  sessionId: string;
  patientId: string;
  patientName: string;
  patientCpf?: string;
  patientPhone?: string;
  organizationId: string;
  date: string;
};

export type QueueTask =
  | { type: "SEND_WHATSAPP"; payload: WhatsAppQueuePayload }
  | {
      type: "SEND_PUSH";
      payload: {
        userId?: string;
        orgId?: string;
        payload: PushPayload;
        organizationId: string;
      };
    }
  | { type: "PROCESS_BACKUP"; payload: Record<string, unknown> }
  | { type: "CLEANUP_LOGS"; payload: Record<string, unknown> }
  | { type: "R2_OBJECT_CREATED"; payload: R2NotificationPayload }
  | { type: "PROCESS_EXAM"; payload: ExamProcessPayload }
  | { type: "PROCESS_BIOMECHANICS_MEDIA"; payload: BiomechanicsProcessPayload }
  | { type: "GENERATE_TTS"; payload: TTSPayload }
  | { type: "TRIGGER_WORKFLOW"; payload: WorkflowTriggerPayload }
  | { type: "GENERATE_NFSE"; payload: GenerateNFSePayload }
  | {
      type: "WA_AUTOMATION";
      payload: {
        organizationId: string;
        phone: string;
        templateKey: AutomationTemplateKey;
        vars: string[];
      };
    }
  | { type: "REINDEX_KB_ITEM"; payload: ReindexKbItemPayload }
  | { type: "INDEX_NOTE_SEMANTIC"; payload: { noteId: string; organizationId: string } };

export type QueueTaskSummary = {
  taskType: QueueTask["type"];
  organizationId?: string;
  entityRefs: Record<string, string>;
  replayable: boolean;
  idempotencyKey: string;
};

function getPayloadRecord(task: QueueTask): Record<string, unknown> {
  return task.payload as Record<string, unknown>;
}

export function deriveQueueIdempotencyKey(task: QueueTask): string {
  const payload = getPayloadRecord(task);
  const organizationId = String(payload.organizationId ?? "global");
  const entityId = String(
    payload.appointmentId ??
      payload.examId ??
      payload.jobId ??
      payload.assessmentId ??
      payload.noteId ??
      payload.patientId ??
      payload.r2Key ??
      payload.workflowType ??
      "unknown",
  );

  return `queue:${task.type}:${organizationId}:${entityId}`;
}

export function summarizeQueueTask(task: QueueTask): QueueTaskSummary {
  const payload = getPayloadRecord(task);
  const entityRefs: Record<string, string> = {};

  for (const key of [
    "patientId",
    "appointmentId",
    "examId",
    "jobId",
    "assessmentId",
    "noteId",
    "r2Key",
    "workflowType",
  ]) {
    const value = payload[key];
    if (typeof value === "string" && value) entityRefs[key] = value;
  }

  return {
    taskType: task.type,
    organizationId: typeof payload.organizationId === "string" ? payload.organizationId : undefined,
    entityRefs,
    replayable: !["PROCESS_BACKUP", "CLEANUP_LOGS"].includes(task.type),
    idempotencyKey: deriveQueueIdempotencyKey(task),
  };
}

/**
 * Handler para o Cloudflare Queues.
 * Processa tarefas em segundo plano: WhatsApp, R2 events, AI, Workflows.
 * Retries automáticos pela política da fila (max_retries = 3).
 */
export async function handleQueue(batch: MessageBatch<QueueTask>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    const task = message.body;
    console.log(`[Queue] Processing task type: ${task.type}`);

    try {
      switch (task.type) {
        case "SEND_WHATSAPP":
          await processWhatsAppMessage(task.payload, env);
          break;

        case "SEND_PUSH":
          if (task.payload.userId) {
            await sendPushToUser(task.payload.userId, task.payload.payload, env);
          } else if (task.payload.orgId) {
            await sendPushToOrg(task.payload.orgId, task.payload.payload, env);
          }
          break;

        case "R2_OBJECT_CREATED":
          await processR2Notification(task.payload, env);
          break;

        case "PROCESS_EXAM":
          await processExamUpload(task.payload, env);
          break;

        case "PROCESS_BIOMECHANICS_MEDIA":
          await processBiomechanicsMedia(task.payload, env);
          break;

        case "GENERATE_TTS":
          await generateTTS(task.payload, env);
          break;

        case "TRIGGER_WORKFLOW":
          await triggerWorkflow(task.payload, env);
          break;

        case "GENERATE_NFSE":
          await generateNFSeForSession(task.payload, env);
          break;

        case "REINDEX_KB_ITEM":
          await reindexKbItem(task.payload, env);
          break;

        case "INDEX_NOTE_SEMANTIC":
          await syncNoteToSemanticIndex(env, task.payload);
          break;

        // Event-driven triggers (from triggerBackgroundEvent → BACKGROUND_QUEUE)
        case "appointment.created" as any:
          await handleAppointmentCreated((task as any).data, env);
          break;

        case "appointment.updated" as any:
          await handleAppointmentUpdated((task as any).data, env);
          break;

        case "patient.inactive" as any:
          await handlePatientInactive((task as any).data, env);
          break;

        case "patient.birthday" as any:
          await handlePatientBirthday((task as any).data, env);
          break;

        // Prescrição criada → gera PDF + envia email
        case "prescription.created" as any:
          await processPrescriptionCreated((task as any).data, env);
          break;

        // Paciente criado → mensagem de boas-vindas
        case "patient.created" as any:
          await processPatientCreatedWelcome((task as any).data, env);
          break;

        // Consulta concluída → review (5ª sessão) + feedback (+2h)
        case "appointment.completed" as any:
          await processAppointmentCompleted((task as any).data, env);
          break;

        // Envio atrasado de template de automação (ex.: feedback +2h).
        case "WA_AUTOMATION": {
          const p = task.payload;
          await sendAutomationTemplate(env, p.organizationId, p.phone, p.templateKey, p.vars);
          break;
        }

        case "PROCESS_BACKUP":
        case "CLEANUP_LOGS":
          console.log(`[Queue] Task ${task.type} acknowledged (no-op placeholder)`);
          break;

        default: {
          const unknownTask = task as any;
          if (unknownTask.data) {
            console.warn(`[Queue] Unknown event type: ${unknownTask.type}`);
          } else {
            console.warn(`[Queue] Unknown task type: ${unknownTask.type}`);
          }
          break;
        }
      }

      // Event-driven automations (gated by AUTOMATION_EXECUTION_ENABLED; no-op otherwise)
      try {
        const evt = task as any;
        const evtOrg = evt?.data?.organizationId ?? evt?.data?.orgId ?? evt?.data?.organization_id;
        if (evt?.data && typeof evt.type === "string" && evtOrg) {
          // Run inside the org context so RLS on `automations` resolves app.org_id.
          await runWithOrg(String(evtOrg), async () => {
            const sql = getRawSql(env, "write");
            await runAutomationsForEvent((q, p) => sql(q, p), env, { type: evt.type, data: evt.data });
          });
        }
      } catch (autoErr) {
        console.error(`[Queue] Automation trigger failed for ${task.type}:`, autoErr);
      }

      message.ack();
    } catch (error) {
      console.error(`[Queue] Error processing task ${task.type}:`, error);
      message.retry({ delaySeconds: backoffDelay(message.attempts) });
    }
  }
}

// ===== WHATSAPP =====

/**
 * Ordena os corpos das requisições Meta para uma mensagem WhatsApp.
 * - preferTemplate (mensagens iniciadas pela clínica): TEMPLATE primeiro, texto
 *   como fallback. Fora da janela de 24h a Meta aceita o texto livre (200) mas
 *   falha a entrega depois (131047), então template-primeiro é o único confiável.
 * - default (respostas dentro da janela): texto livre primeiro (mantém o texto
 *   exato com "sessão"), template como fallback.
 */
export function buildWhatsAppRequestBodies(
  payload: WhatsAppQueuePayload,
): Array<{ kind: "template" | "text"; body: Record<string, unknown> }> {
  const cleanTo = payload.to.replace(/\D/g, "");
  const text = {
    kind: "text" as const,
    body: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanTo,
      type: "text",
      text: { preview_url: false, body: payload.messageText },
    },
  };
  const template = {
    kind: "template" as const,
    body: {
      messaging_product: "whatsapp",
      to: cleanTo,
      type: "template",
      template: {
        name: payload.templateName,
        language: { code: payload.languageCode },
        components: [{ type: "body", parameters: payload.bodyParameters }],
      },
    },
  };
  return payload.preferTemplate ? [template, text] : [text, template];
}

async function processWhatsAppMessage(payload: WhatsAppQueuePayload, env: Env): Promise<void> {
  if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
    console.warn("[Queue/WhatsApp] Missing credentials, skipping.");
    return;
  }

  const cleanTo = payload.to.replace(/\D/g, "");
  let metaMessageId: string | undefined;

  const endpoint = `https://graph.facebook.com/v25.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
  };
  const requests = buildWhatsAppRequestBodies(payload);
  const send = (i: number) =>
    fetch(endpoint, { method: "POST", headers: authHeaders, body: JSON.stringify(requests[i].body) });

  // Tenta o envio primário; se a Meta rejeitar (não-ok), cai no fallback.
  let metaRes = await send(0);
  if (!metaRes.ok) {
    metaRes = await send(1);
  }

  if (metaRes.ok) {
    const metaData = (await metaRes.json().catch(() => ({}))) as any;
    metaMessageId = metaData?.messages?.[0]?.id;
  } else {
    const err = (await metaRes.json().catch(() => ({}))) as any;
    throw new Error(`WhatsApp API error ${metaRes.status}: ${err?.error?.message ?? "unknown"}`);
  }

  // 3. Salva a mensagem no histórico do CRM e transmite tempo real via WebSocket
  try {
    const pool = await createPoolForOrg(env, payload.organizationId);
    const contact = await resolveOrCreateContact(
      pool,
      payload.organizationId,
      cleanTo,
      null,
      null,
      null,
      null,
      null,
    );

    if (contact) {
      const conversation = await findOrCreateConversation(
        pool,
        payload.organizationId,
        contact.id,
        "whatsapp",
      );

      if (conversation) {
        const savedMsg = await addMessage(
          pool,
          conversation.id,
          payload.organizationId,
          contact.id,
          "outbound",
          "system",
          contact.id,
          "text",
          payload.messageText,
          metaMessageId,
          {
            status: "sent",
            metadata: {
              appointment_id: payload.appointmentId,
              template_key: payload.templateName,
              via_queue: true,
              autoReply: true,
            },
          },
        );

        await broadcastToOrg(env, payload.organizationId, {
          type: "whatsapp_message",
          conversationId: conversation.id,
          message: {
            id: savedMsg?.id,
            content: payload.messageText,
            direction: "outbound",
            messageType: "text",
            status: "sent",
            createdAt: new Date().toISOString(),
          },
        });
      }
    }
  } catch (logErr) {
    console.warn("[Queue/WhatsApp] Failed to log message to CRM (non-fatal):", logErr);
  }

  writeEvent(env, {
    event: "whatsapp_sent",
    orgId: payload.organizationId,
    route: "/queue/whatsapp",
    method: "QUEUE",
    status: 200,
  });
}

// ===== R2 EVENT NOTIFICATIONS =====

async function processR2Notification(payload: R2NotificationPayload, env: Env): Promise<void> {
  console.log(`[Queue/R2] ${payload.action} → ${payload.key}`);

  if (payload.action !== "PutObject") return;

  const key = payload.key;
  const contentType = payload.contentType ?? "";

  // Detecta tipo de arquivo e enfileira processamento AI apropriado
  if (contentType.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic)$/i.test(key)) {
    await env.BACKGROUND_QUEUE.send({
      type: "PROCESS_EXAM",
      payload: {
        examId: crypto.randomUUID(),
        r2Key: key,
        organizationId: payload.organizationId ?? "unknown",
        patientId: payload.patientId ?? "unknown",
        fileType: "image",
      },
    });
  } else if (contentType.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|webm)$/i.test(key)) {
    await env.BACKGROUND_QUEUE.send({
      type: "PROCESS_EXAM",
      payload: {
        examId: crypto.randomUUID(),
        r2Key: key,
        organizationId: payload.organizationId ?? "unknown",
        patientId: payload.patientId ?? "unknown",
        fileType: "audio",
      },
    });
  }

  writeEvent(env, {
    event: "r2_object_processed",
    orgId: payload.organizationId ?? "global",
    route: "/queue/r2",
    method: "QUEUE",
    status: 200,
  });
}

// ===== AI: PROCESSAMENTO DE EXAMES =====

async function processExamUpload(payload: ExamProcessPayload, env: Env): Promise<void> {
  console.log(`[Queue/Exam] Processing ${payload.fileType}: ${payload.r2Key}`);

  // Baixa arquivo do R2
  const object = await env.MEDIA_BUCKET.get(payload.r2Key);
  if (!object) {
    console.warn(`[Queue/Exam] Object not found: ${payload.r2Key}`);
    return;
  }

  const arrayBuffer = await object.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  let extractedText = "";

  try {
    if (payload.fileType === "image") {
      extractedText = await analyzeClinicImage(
        env,
        base64,
        "Analise esta imagem clínica/radiografia em português brasileiro. Descreva achados relevantes, estruturas anatômicas visíveis e qualquer anomalia ou observação clínica importante.",
      );
    } else if (payload.fileType === "audio") {
      extractedText = await transcribeAudio(env, base64, "pt-BR");
    }
  } catch (err) {
    console.error(`[Queue/Exam] AI processing failed:`, err);
    return;
  }

  if (!extractedText) return;

  // Salva resultado no banco
  const pool = createPool(env);
  await pool
    .query(
      `INSERT INTO exam_ai_results (exam_id, patient_id, organization_id, r2_key, extracted_text, file_type, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (r2_key) DO UPDATE SET extracted_text = EXCLUDED.extracted_text, updated_at = NOW()`,
      [
        payload.examId,
        payload.patientId,
        payload.organizationId,
        payload.r2Key,
        extractedText,
        payload.fileType,
      ],
    )
    .catch(() => {
      // Tabela pode não existir ainda — log e continua
      console.warn("[Queue/Exam] exam_ai_results table not found, skipping DB write");
    });

  writeEvent(env, {
    event: `exam_ai_${payload.fileType}`,
    orgId: payload.organizationId,
    route: "/queue/exam",
    method: "QUEUE",
    status: 200,
  });
}

// ===== BIOMECHANICS MEDIA PROCESSING =====

/**
 * Processa uma captura biomecânica a partir dos landmarks REAIS enviados pelo
 * aparelho (ou, na fase 2, extraídos do vídeo por um Container).
 *
 * Antes, esta função chamava `deterministicBiomechanicsMetrics()`, que devolvia
 * números fixos por tipo de avaliação — cadência 168, valgo 12, simetria 86 —
 * independentemente do vídeo. Aquilo alimentava um laudo assinado com CREFITO.
 * A função foi apagada; o teste `noSyntheticMetrics.test.ts` impede que volte.
 *
 * Sem bundle de landmarks NÃO há métrica: o job falha com
 * `missing_landmarks` e a avaliação vai para `awaiting_landmarks`. Nenhuma
 * linha é escrita. Não produzir número é o comportamento correto quando não há
 * insumo.
 */
async function processBiomechanicsMedia(
  payload: BiomechanicsProcessPayload,
  env: Env,
): Promise<void> {
  const pool = await createPoolForOrg(env, payload.organizationId);
  const algorithmVersion = KINEMATICS_VERSION;

  console.log(`[Queue/Biomechanics] Processing job ${payload.jobId}`);

  await pool.query(
    `UPDATE biomechanics_jobs
       SET status = 'running', stage = 'fetch_landmarks', progress = 10,
           started_at = COALESCE(started_at, NOW()), updated_at = NOW()
     WHERE id = $1 AND organization_id = $2`,
    [payload.jobId, payload.organizationId],
  );

  const assessmentResult = await pool.query(
    `SELECT id, patient_id, type, primary_media_id, analysis_data, protocol_id
       FROM biomechanics_assessments
      WHERE id = $1 AND organization_id = $2`,
    [payload.assessmentId, payload.organizationId],
  );
  const assessment = assessmentResult.rows[0];
  if (!assessment) {
    throw new Error(`Assessment not found: ${payload.assessmentId}`);
  }

  const mediaId = payload.mediaId ?? assessment.primary_media_id ?? null;

  const mediaResult = await pool.query(
    `SELECT id, landmarks_r2_key, landmarks_sha256, landmarks_schema, fps, view,
            attempt, pose_engine, coordinate_space, frame_count, duration_ms
       FROM biomechanics_media
      WHERE id = $1 AND organization_id = $2`,
    [mediaId, payload.organizationId],
  );
  const media = mediaResult.rows[0];

  if (!media?.landmarks_r2_key) {
    await failJob(
      pool,
      payload,
      "missing_landmarks",
      "A captura não tem bundle de landmarks. Envie os landmarks do aparelho ou solicite o reprocessamento em nuvem.",
      "awaiting_landmarks",
    );
    return;
  }

  // ── ler e verificar o bundle ──────────────────────────────────────────────
  const object = await env.MEDIA_BUCKET.get(media.landmarks_r2_key as string);
  if (!object) {
    await failJob(
      pool,
      payload,
      "landmarks_object_missing",
      `Bundle não encontrado no R2: ${media.landmarks_r2_key}`,
    );
    return;
  }

  const rawBytes = new Uint8Array(await object.arrayBuffer());
  const digest = await sha256Hex(rawBytes);

  if (media.landmarks_sha256 && digest !== media.landmarks_sha256) {
    // Falha explícita em vez de seguir com dado possivelmente corrompido: um
    // laudo tirado de bundle truncado é indistinguível de um laudo válido.
    await failJob(
      pool,
      payload,
      "landmarks_digest_mismatch",
      "O bundle de landmarks no R2 não confere com o hash registrado.",
    );
    return;
  }

  let bundle: { header: BundleHeader; frames: LandmarkFrame[] };
  try {
    bundle = await decodePoseBundle(rawBytes);
  } catch (error) {
    await failJob(
      pool,
      payload,
      "landmarks_decode_failed",
      error instanceof Error ? error.message : "Bundle de landmarks ilegível.",
    );
    return;
  }

  if (bundle.frames.length === 0) {
    await failJob(pool, payload, "landmarks_empty", "O bundle não contém frames.");
    return;
  }

  await pool.query(
    `UPDATE biomechanics_jobs
       SET stage = 'metric_calculation', progress = 60, updated_at = NOW()
     WHERE id = $1 AND organization_id = $2`,
    [payload.jobId, payload.organizationId],
  );

  // ── protocolo (define quais métricas o exame pede) ────────────────────────
  let protocol: { slug?: string; metricDefinitions?: Array<{ key: string }> } | null = null;
  if (assessment.protocol_id) {
    const protocolResult = await pool.query(
      `SELECT slug, metric_definitions FROM biomechanics_protocols WHERE id = $1`,
      [assessment.protocol_id],
    );
    const row = protocolResult.rows[0];
    if (row) {
      protocol = {
        slug: row.slug,
        metricDefinitions: Array.isArray(row.metric_definitions) ? row.metric_definitions : [],
      };
    }
  }

  const phase = (payload.phase ?? "device") as "device" | "container";
  const provenance = phase === "container" ? "container_pose" : "device_pose";

  const result = computeAssessmentMetrics({
    header: bundle.header,
    frames: bundle.frames,
    protocol,
    provenance,
    algorithmVersion,
  });

  const poseEngine =
    (media.pose_engine as string | null) ??
    `${bundle.header.poseEngine?.name ?? "unknown"}@${bundle.header.poseEngine?.version ?? "0"}`;

  // ── persistência ──────────────────────────────────────────────────────────
  // Supersessão em vez de DELETE: a linha antiga continua consultável para
  // responder "por que o número mudou?" meses depois.
  await pool.query(
    `UPDATE biomechanics_metrics
        SET superseded_at = NOW()
      WHERE assessment_id = $1 AND organization_id = $2
        AND superseded_at IS NULL
        AND provenance IN ('device_pose','container_pose','synthetic_demo')`,
    [payload.assessmentId, payload.organizationId],
  );

  for (const metric of result.metrics) {
    await pool.query(
      `INSERT INTO biomechanics_metrics (
         assessment_id, organization_id, patient_id, metric_key, metric_value, unit,
         side, phase, view, confidence, source, severity, algorithm_version,
         provenance, pose_engine, job_id, media_id, attempt, sample_count,
         computed_at, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'algorithm',$11,$12,$13,$14,$15,$16,$17,$18,NOW(),NOW())`,
      [
        payload.assessmentId,
        payload.organizationId,
        payload.patientId,
        metric.metricKey,
        metric.metricValue,
        metric.unit,
        metric.side ?? null,
        metric.phase ?? null,
        metric.view,
        metric.confidence,
        metric.severity ?? null,
        algorithmVersion,
        metric.provenance,
        poseEngine,
        payload.jobId,
        mediaId,
        bundle.header.attempt ?? 1,
        metric.sampleCount,
      ],
    );
  }

  await pool.query(
    `UPDATE biomechanics_events
        SET superseded_at = NOW()
      WHERE assessment_id = $1 AND organization_id = $2 AND superseded_at IS NULL`,
    [payload.assessmentId, payload.organizationId],
  );

  for (const event of result.events) {
    await pool.query(
      `INSERT INTO biomechanics_events (
         organization_id, assessment_id, media_id, event_type, time_ms, frame_index,
         confidence, metadata, provenance, job_id, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
      [
        payload.organizationId,
        payload.assessmentId,
        mediaId,
        event.eventType,
        event.timeMs,
        event.frameIndex,
        event.confidence,
        JSON.stringify(event.metadata ?? {}),
        provenance,
        payload.jobId,
      ],
    );
  }

  await pool.query(
    `DELETE FROM biomechanics_frames
      WHERE assessment_id = $1 AND organization_id = $2 AND media_id IS NOT DISTINCT FROM $3`,
    [payload.assessmentId, payload.organizationId, mediaId],
  );

  for (const keyframe of result.keyframes) {
    await pool.query(
      `INSERT INTO biomechanics_frames (
         organization_id, assessment_id, media_id, frame_index, time_ms,
         landmarks, confidence, events, provenance, attempt, view, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
      [
        payload.organizationId,
        payload.assessmentId,
        mediaId,
        keyframe.frameIndex,
        keyframe.timeMs,
        JSON.stringify(keyframe.landmarks),
        keyframe.confidence,
        JSON.stringify([]),
        provenance,
        keyframe.attempt,
        keyframe.view,
      ],
    );
  }

  // `symmetry_score` fica NULL quando a simetria não foi mensurável. Antes o
  // código fazia `?? 84`, inventando um número para preencher a coluna.
  const symmetryMetric = result.metrics.find((m) => m.metricKey === "symmetry");
  const symmetry = symmetryMetric ? symmetryMetric.metricValue : null;

  const previousAnalysisData =
    assessment.analysis_data && typeof assessment.analysis_data === "object"
      ? assessment.analysis_data
      : {};

  // Sem métrica alguma a avaliação não vai para revisão: não há o que revisar.
  const nextStatus = result.metrics.length > 0 ? "needs_review" : "failed";

  await pool.query(
    `UPDATE biomechanics_assessments
       SET status = $1,
           symmetry_score = $2,
           quality_score = $3,
           ai_validation_status = $4,
           algorithm_version = $5,
           pose_provenance = $6,
           analysis_data = $7,
           updated_at = NOW()
     WHERE id = $8 AND organization_id = $9`,
    [
      nextStatus,
      symmetry,
      result.quality.score,
      result.metrics.length > 0 ? "ready_for_review" : "no_measurable_metrics",
      algorithmVersion,
      provenance,
      JSON.stringify({
        ...previousAnalysisData,
        metrics: Object.fromEntries(
          result.metrics.map((m) => [
            m.side && m.side !== "bilateral" ? `${m.metricKey}_${m.side}` : m.metricKey,
            m.metricValue,
          ]),
        ),
        // As rejeições viajam junto de propósito: a tela mostra "não mensurável
        // nesta captura" com o motivo, em vez de um campo vazio inexplicado.
        rejected: result.rejected,
        quality: result.quality,
        processing: {
          jobId: payload.jobId,
          algorithmVersion,
          provenance,
          poseEngine,
          frameCount: bundle.frames.length,
          view: bundle.header.view,
          attempt: bundle.header.attempt,
        },
      }),
      payload.assessmentId,
      payload.organizationId,
    ],
  );

  await pool.query(
    `UPDATE biomechanics_jobs
       SET status = $1, stage = $2, progress = 100,
           model_provider = 'fisioflow', model_name = $3, algorithm_version = $4,
           completed_at = NOW(), updated_at = NOW()
     WHERE id = $5 AND organization_id = $6`,
    [
      result.metrics.length > 0 ? "completed" : "failed",
      result.metrics.length > 0 ? "ready_for_review" : "no_measurable_metrics",
      poseEngine,
      algorithmVersion,
      payload.jobId,
      payload.organizationId,
    ],
  );

  writeEvent(env, {
    event: "biomechanics_job_completed",
    orgId: payload.organizationId,
    route: "/queue/biomechanics",
    method: "QUEUE",
    status: result.metrics.length > 0 ? 200 : 422,
    value: result.quality.score,
  });
}

async function failJob(
  pool: { query: (sql: string, params: unknown[]) => Promise<unknown> },
  payload: BiomechanicsProcessPayload,
  errorCode: string,
  errorMessage: string,
  assessmentStatus?: string,
): Promise<void> {
  await pool.query(
    `UPDATE biomechanics_jobs
       SET status = 'failed', stage = 'failed', error_code = $1, error_message = $2,
           completed_at = NOW(), updated_at = NOW()
     WHERE id = $3 AND organization_id = $4`,
    [errorCode, errorMessage, payload.jobId, payload.organizationId],
  );

  if (assessmentStatus) {
    await pool.query(
      `UPDATE biomechanics_assessments
         SET status = $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3`,
      [assessmentStatus, payload.assessmentId, payload.organizationId],
    );
  }

  console.warn(`[Queue/Biomechanics] job ${payload.jobId} falhou: ${errorCode} — ${errorMessage}`);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ===== TTS: TEXT-TO-SPEECH PARA EXERCÍCIOS =====

async function generateTTS(payload: TTSPayload, env: Env): Promise<void> {
  console.log(`[Queue/TTS] Generating audio for key: ${payload.r2Key}`);

  if (!env.AI) {
    console.warn("[Queue/TTS] Workers AI not available");
    return;
  }

  try {
    const response = await env.AI.run(
      "@cf/deepgram/aura-2-es",
      { text: payload.text, voice: payload.voice ?? "asteria" },
      { gateway: { id: "fisioflow-gateway", cacheTtl: 86400 } },
    );

    const r = response as any;
    const audioBuffer: ArrayBuffer | undefined =
      ArrayBuffer.isView(r) || r instanceof ArrayBuffer
        ? (r as ArrayBuffer)
        : typeof r.arrayBuffer === "function"
          ? await r.arrayBuffer()
          : undefined;
    if (!audioBuffer) return;

    await env.MEDIA_BUCKET.put(payload.r2Key, audioBuffer, {
      httpMetadata: { contentType: "audio/mpeg" },
      customMetadata: { organizationId: payload.organizationId, generated: "tts" },
    });

    writeEvent(env, {
      event: "tts_generated",
      orgId: payload.organizationId,
      route: "/queue/tts",
      method: "QUEUE",
      status: 200,
    });
  } catch (err) {
    console.error("[Queue/TTS] Error:", err);
    throw err; // Retry automático pelo Queue
  }
}

// ===== TRIGGER WORKFLOW =====

async function triggerWorkflow(payload: WorkflowTriggerPayload, env: Env): Promise<void> {
  const workflowMap: Record<string, any> = {
    "appointment-reminder": env.WORKFLOW_APPOINTMENT_REMINDER,
    "patient-onboarding": env.WORKFLOW_PATIENT_ONBOARDING,
    nfse: env.WORKFLOW_NFSE,
    "hep-compliance": env.WORKFLOW_HEP_COMPLIANCE,
    discharge: env.WORKFLOW_DISCHARGE,
    reengagement: env.WORKFLOW_REENGAGEMENT,
  };

  const workflow = workflowMap[payload.workflowType];
  if (!workflow) {
    console.warn(`[Queue/Workflow] Unknown workflow: ${payload.workflowType}`);
    return;
  }

  const instance = await workflow.create({
    id: `${payload.workflowType}-${crypto.randomUUID()}`,
    params: payload.params,
  });

  console.log(`[Queue/Workflow] Started ${payload.workflowType}: ${instance.id}`);

  writeEvent(env, {
    event: `workflow_started_${payload.workflowType.replace(/-/g, "_")}`,
    orgId: payload.organizationId,
    route: "/queue/workflow",
    method: "QUEUE",
    status: 200,
  });
}

// ===== NFS-e BATCH GENERATION =====

async function generateNFSeForSession(
  payload: {
    sessionId: string;
    patientId: string;
    patientName: string;
    patientCpf?: string;
    patientPhone?: string;
    organizationId: string;
    date: string;
  },
  env: Env,
): Promise<void> {
  const url = env.NEON_URL || env.HYPERDRIVE?.connectionString;
  if (!url) return;

  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);

  // Check if NFS-e config exists for the org
  const cfgRows = await sql`
    SELECT * FROM nfse_config WHERE organization_id = ${payload.organizationId} LIMIT 1
  `.catch(() => [] as any[]);

  if (!cfgRows?.length) {
    console.warn(`[Queue/NFS-e] No config for org ${payload.organizationId}, skipping.`);
    return;
  }

  const cfg = cfgRows[0];

  // S10 fix: race em batch concorrente — UNIQUE (org, numero_rps) garante
  // unicidade; em caso de conflito (2 consumers leram mesmo MAX) re-tenta
  // ate 5 vezes com novo MAX+1.
  const aliquota = Number(cfg.aliquota_iss ?? cfg.aliquota_padrao ?? 0.02);
  const valorServico = Number(cfg.valor_padrao_servico ?? 150);
  const valorIss = Number((valorServico * aliquota).toFixed(2));
  const codigoServico = cfg.codigo_servico_padrao ?? "04391";
  const discriminacao = "Sessão de fisioterapia - " + payload.date;
  const dataEmissao = new Date().toISOString();

  let inserted = false;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
    const seqRows = await sql`
      SELECT COALESCE(MAX(CAST(numero_rps AS INTEGER)), 0) + 1 AS next_rps
      FROM nfse_records WHERE organization_id = ${payload.organizationId}
    `;
    const numeroRps = String(seqRows[0]?.next_rps ?? 1);

    try {
      const inserts = await sql`
        INSERT INTO nfse_records
          (organization_id, patient_id, numero_rps, serie_rps, data_emissao,
           valor_servico, aliquota_iss, valor_iss, codigo_servico, discriminacao,
           tomador_nome, tomador_cpf_cnpj, status, created_at, updated_at)
        VALUES (
          ${payload.organizationId}, ${payload.patientId}, ${numeroRps}, 'RPS',
          ${dataEmissao}, ${valorServico}, ${aliquota}, ${valorIss},
          ${codigoServico}, ${discriminacao},
          ${payload.patientName}, ${payload.patientCpf ?? null},
          'rascunho', NOW(), NOW()
        )
        ON CONFLICT (organization_id, numero_rps) DO NOTHING
        RETURNING id
      `;
      if (inserts.length > 0) {
        inserted = true;
        console.log(
          `[Queue/NFS-e] Draft created session=${payload.sessionId} rps=${numeroRps} attempt=${attempt + 1}`,
        );
      } else {
        console.log(
          `[Queue/NFS-e] RPS ${numeroRps} collided (attempt ${attempt + 1}), retrying...`,
        );
      }
    } catch (err) {
      lastErr = err;
      break;
    }
  }
  if (!inserted) {
    console.warn(
      `[Queue/NFS-e] Insert failed for session ${payload.sessionId} after 5 attempts:`,
      lastErr instanceof Error ? lastErr.message : lastErr,
    );
  }
}

// ===== PRESCRIÇÃO: PDF + EMAIL =====

/**
 * Gera o PDF da prescrição, espelha no R2 e envia por email ao paciente.
 * Portado de `routes/inngest.ts` (código morto: o Inngest nunca recebia eventos —
 * tudo passou a ir para o Cloudflare Queue, mas este handler não existia aqui).
 */
export async function processPrescriptionCreated(
  data: { planId: string; patientId: string; organizationId: string },
  env: Env,
): Promise<{ pdfUrl?: string; emailSent: boolean; error?: string }> {
  const { planId, patientId, organizationId } = data;
  const db = createPool(env);

  const res = await db.query(
    `SELECT p.full_name as patient_name, p.email, ep.name as plan_name,
       json_agg(json_build_object('name', ex.title, 'sets', i.sets, 'reps', i.repetitions, 'notes', i.notes) ORDER BY i.order_index) FILTER (WHERE i.id IS NOT NULL) AS items
     FROM exercise_plans ep
     JOIN patients p ON p.id = ep.patient_id
     LEFT JOIN exercise_plan_items i ON i.plan_id = ep.id
     LEFT JOIN exercises ex ON ex.id = i.exercise_id
     WHERE ep.id = $1
     GROUP BY ep.id, p.id`,
    [planId],
  );
  const plan = res.rows[0];
  if (!plan) return { emailSent: false, error: "Plano não encontrado" };

  const html = buildHtml({
    type: "prescription",
    title: plan.plan_name || "Prescrição de Exercícios",
    patientName: plan.patient_name,
    patientId,
    data: {
      content:
        plan.items
          ?.map(
            (i: any) =>
              `- ${i.name ?? "Exercício"}: ${i.sets || "-"} séries de ${i.reps || "-"} reps. ${i.notes ? `(${i.notes})` : ""}`,
          )
          .join("\n") || "Nenhum exercício especificado.",
      indication: "Programa de exercícios domiciliares",
    },
  });

  const pdfBuffer = await generatePdfQuickAction(html);
  const r2 = new R2Service(env);
  const timestamp = Date.now();
  const pdfKey = `reports/${organizationId}/${patientId}/prescription-${timestamp}.pdf`;
  const fileName = `prescription-${String(plan.patient_name ?? "paciente").replace(/\s+/g, "_")}`;

  await r2.uploadFile(pdfKey, new Uint8Array(pdfBuffer), "application/pdf", `${fileName}.pdf`);
  const pdfUrl = `${env.R2_PUBLIC_URL}/${pdfKey}`;

  if (plan.email) {
    try {
      await sendPrescriptionEmail(env, plan.email, {
        patientName: plan.patient_name,
        pdfUrl,
        title: plan.plan_name || "Prescrição de Exercícios",
      });
      return { pdfUrl, emailSent: true };
    } catch (err) {
      console.error(`[Queue] Failed to send prescription email for patient ${patientId}:`, err);
    }
  }

  return { pdfUrl, emailSent: false };
}

// ===== FLUXOS WHATSAPP AUTOMÁTICOS (via BACKGROUND_QUEUE) =====

function firstName(name: unknown): string {
  return String(name ?? "").trim().split(/\s+/)[0] || "Paciente";
}

/** patient.created → mensagem de boas-vindas (gated por automations_enabled). */
export async function processPatientCreatedWelcome(
  data: { organizationId?: string; name?: string; phone?: string },
  env: Env,
): Promise<void> {
  if (!data.organizationId) return;
  // Template aprovado na Meta tem 0 variáveis — não enviar parâmetros.
  await sendAutomationTemplate(env, data.organizationId, data.phone, "boas_vindas_paciente", []);
}

/**
 * appointment.completed → pedido de avaliação no Google na 5ª sessão concluída
 * (imediato) + pedido de feedback enfileirado com atraso de 2h. Ambos gated.
 * O lembrete de exercícios (+2 dias) é tratado por cron (excede o atraso máx da fila).
 */
export async function processAppointmentCompleted(
  data: { organizationId?: string; patientId?: string; name?: string; phone?: string },
  env: Env,
): Promise<void> {
  if (!data.organizationId) return;
  const name = firstName(data.name);

  // Review na 5ª sessão concluída.
  if (data.patientId) {
    const pool = createPool(env);
    const res = await pool.query(
      `SELECT COUNT(*)::int AS count
         FROM appointments
        WHERE patient_id = $1
          AND status::text IN ('atendido', 'avaliacao', 'completed', 'realizado', 'concluido')`,
      [data.patientId],
    );
    if (Number(res.rows[0]?.count) === 5) {
      await sendAutomationTemplate(env, data.organizationId, data.phone, "avaliacao_google", [name]);
    }
  }

  // Feedback 2h depois — re-enfileira com delaySeconds (limite ~12h da fila).
  if (env.BACKGROUND_QUEUE && data.phone) {
    await env.BACKGROUND_QUEUE.send(
      {
        type: "WA_AUTOMATION",
        payload: {
          organizationId: data.organizationId,
          phone: data.phone,
          templateKey: "feedback_atendimento",
          vars: [name],
        },
      },
      { delaySeconds: 7200 },
    );
  }
}

// ===== EVENT HANDLERS =====

function formatDatePtBr(dateVal: any): string {
  if (!dateVal) return "";
  const str = String(dateVal).trim().replace(/\/+/g, "-");
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [d, m, y] = str.split("-");
    return `${d}/${m}/${y}`;
  }
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return str;
  }
}

async function handleAppointmentCreated(data: any, env: Env) {
  const { appointmentId, patientId, patientName, patientPhone, date, startTime, organizationId } =
    data;
  if (!patientPhone) return;

  let finalDate = date;
  let finalStartTime = startTime;

  // Consultar o banco para obter o estado atualizado após os 60s de delay
  if (appointmentId && env.DATABASE_URL) {
    try {
      const db = createDb(env, "read");
      const [apt] = await db
        .select({
          id: appointments.id,
          status: appointments.status,
          date: appointments.date,
          startTime: appointments.startTime,
        })
        .from(appointments)
        .where(eq(appointments.id, appointmentId))
        .limit(1);

      // Se o agendamento foi cancelado ou removido nos 60s, aborta o envio
      if (!apt || apt.status === "cancelado") {
        console.log(`[Queue] Appointment ${appointmentId} was cancelled/deleted within 60s window. Skipping creation WhatsApp.`);
        return;
      }

      if (apt.date) finalDate = apt.date;
      if (apt.startTime) finalStartTime = apt.startTime;
    } catch (err) {
      console.warn("[Queue] Failed to query appointment DB state (non-fatal):", err);
    }
  }

  const firstName = patientName?.split(" ")[0] || "Paciente";
  const formattedDate = formatDatePtBr(finalDate);
  const time = (finalStartTime || "")?.substring(0, 5) || "";

  const messageText = `Olá, ${firstName}! 👋 Seu agendamento no FisioFlow foi confirmado para o dia ${formattedDate} às ${time}. Até lá!`;

  await processWhatsAppMessage(
    {
      to: patientPhone,
      templateName: "consulta_confirmada",
      languageCode: "pt_BR",
      bodyParameters: [
        { type: "text", text: firstName },
        { type: "text", text: formattedDate },
        { type: "text", text: time },
      ],
      organizationId,
      patientId,
      messageText,
      appointmentId,
      // Confirmação é iniciada pela clínica → template primeiro (senão 131047
      // fora da janela de 24h faz o texto livre "enviar" mas não entregar).
      preferTemplate: true,
    },
    env,
  );
}

async function handleAppointmentUpdated(data: any, env: Env) {
  const { appointmentId, patientId, date, startTime, status: _status, organizationId } = data;
  if (!appointmentId || !env.DATABASE_URL) return;

  try {
    const db = createDb(env, "read");
    const [apt] = await db
      .select({
        id: appointments.id,
        status: appointments.status,
        date: appointments.date,
        startTime: appointments.startTime,
        patientId: appointments.patientId,
        organizationId: appointments.organizationId,
      })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!apt || apt.status === "cancelado") {
      return;
    }

    // Verificar se já existe mensagem gravada para este agendamento no histórico
    const pool = await createPoolForOrg(env, apt.organizationId || organizationId);
    const checkRes = await pool.query(
      `SELECT id FROM whatsapp_messages WHERE metadata->>'appointment_id' = $1 LIMIT 1`,
      [appointmentId],
    );

    if (!checkRes.rows || checkRes.rows.length === 0) {
      // Nenhuma mensagem foi enviada ainda (ex: alteração feita nos primeiros 60s da criação).
      // handleAppointmentCreated enviará a mensagem de criação já com os dados corretos ao expirar o tempo.
      console.log(`[Queue] Appointment ${appointmentId} updated before initial notice was sent. Skipping duplicate update notice.`);
      return;
    }

    // Se a mensagem inicial já tinha sido enviada, envia o aviso de reagendamento
    const targetPatientId = apt.patientId || patientId;
    const targetOrgId = apt.organizationId || organizationId;

    const [patientRow] = await db
      .select({ fullName: patients.fullName, phone: patients.phone })
      .from(patients)
      .where(eq(patients.id, targetPatientId))
      .limit(1);

    if (!patientRow?.phone) return;

    const firstName = patientRow.fullName?.split(" ")[0] || "Paciente";
    const formattedDate = formatDatePtBr(apt.date || date);
    const time = (apt.startTime || startTime)?.substring(0, 5) || "";

    const messageText = `Olá, ${firstName}! 🗓️ Sua sessão no FisioFlow foi reagendada para o dia ${formattedDate} às ${time}. Qualquer dúvida, estamos à disposição!`;

    await processWhatsAppMessage(
      {
        to: patientRow.phone,
        templateName: "consulta_confirmada",
        languageCode: "pt_BR",
        bodyParameters: [
          { type: "text", text: firstName },
          { type: "text", text: formattedDate },
          { type: "text", text: time },
        ],
        organizationId: targetOrgId,
        patientId: targetPatientId,
        messageText,
        appointmentId,
      },
      env,
    );
  } catch (err) {
    console.error("[Queue] Error handling appointment update:", err);
  }
}

async function handlePatientInactive(data: any, env: Env) {
  const { patientId, name, phone, organizationId } = data;

  if (env.WORKFLOW_REENGAGEMENT) {
    // Inicia o workflow de reengajamento progressivo
    await env.WORKFLOW_REENGAGEMENT.create({
      id: `reengage-${patientId}-${new Date().toISOString().slice(0, 10)}`,
      params: {
        patientId,
        patientName: name,
        patientPhone: phone,
        organizationId,
        therapistName: "seu fisioterapeuta",
        daysSinceLastAppointment: 15,
      },
    });
  }
}

async function handlePatientBirthday(data: any, env: Env) {
  const { patientId, name, phone, organizationId } = data;
  if (!phone) return;

  const firstName = name?.split(" ")[0] || "Paciente";
  const messageText = `Parabéns, ${firstName}! 🎂 O FisioFlow te deseja um dia incrível e muita saúde!`;

  await processWhatsAppMessage(
    {
      to: phone,
      templateName: "parabens_paciente",
      languageCode: "pt_BR",
      bodyParameters: [{ type: "text", text: firstName }],
      organizationId,
      patientId,
      messageText,
      appointmentId: "",
    },
    env,
  );
}
