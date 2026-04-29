import type { Env } from "./types/env";
import { createPool } from "./lib/db";
import { writeEvent } from "./lib/analytics";
import { transcribeAudio, analyzeClinicImage } from "./lib/ai-native";

export type WhatsAppQueuePayload = {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParameters: Array<{ type: "text"; text: string }>;
  organizationId: string;
  patientId: string;
  messageText: string;
  appointmentId: string;
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

export type QueueTask =
  | { type: "SEND_WHATSAPP"; payload: WhatsAppQueuePayload }
  | { type: "PROCESS_BACKUP"; payload: Record<string, unknown> }
  | { type: "CLEANUP_LOGS"; payload: Record<string, unknown> }
  | { type: "R2_OBJECT_CREATED"; payload: R2NotificationPayload }
  | { type: "PROCESS_EXAM"; payload: ExamProcessPayload }
  | { type: "GENERATE_TTS"; payload: TTSPayload }
  | { type: "TRIGGER_WORKFLOW"; payload: WorkflowTriggerPayload };

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

  for (const key of ["patientId", "appointmentId", "examId", "r2Key", "workflowType"]) {
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

        case "R2_OBJECT_CREATED":
          await processR2Notification(task.payload, env);
          break;

        case "PROCESS_EXAM":
          await processExamUpload(task.payload, env);
          break;

        case "GENERATE_TTS":
          await generateTTS(task.payload, env);
          break;

        case "TRIGGER_WORKFLOW":
          await triggerWorkflow(task.payload, env);
          break;

        case "PROCESS_BACKUP":
        case "CLEANUP_LOGS":
          console.log(`[Queue] Task ${task.type} acknowledged (no-op placeholder)`);
          break;

        default:
          console.warn(`[Queue] Unknown task type`);
      }

      message.ack();
    } catch (error) {
      console.error(`[Queue] Error processing task ${task.type}:`, error);
      message.retry();
    }
  }
}

// ===== WHATSAPP =====

async function processWhatsAppMessage(payload: WhatsAppQueuePayload, env: Env): Promise<void> {
  if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
    console.warn("[Queue/WhatsApp] Missing credentials, skipping.");
    return;
  }

  const metaRes = await fetch(
    `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: payload.to.replace(/\D/g, ""),
        type: "template",
        template: {
          name: payload.templateName,
          language: { code: payload.languageCode },
          components: [{ type: "body", parameters: payload.bodyParameters }],
        },
      }),
    },
  );

  if (!metaRes.ok) {
    const err = (await metaRes.json().catch(() => ({}))) as any;
    throw new Error(`WhatsApp API error ${metaRes.status}: ${err?.error?.message ?? "unknown"}`);
  }

  const pool = createPool(env);
  await pool.query(
    `INSERT INTO whatsapp_messages (
      organization_id, patient_id, from_phone, to_phone, message, type, status, metadata, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
    [
      payload.organizationId,
      payload.patientId,
      "clinic",
      payload.to,
      payload.messageText,
      "template",
      "sent",
      JSON.stringify({
        appointment_id: payload.appointmentId,
        template_key: payload.templateName,
        via_queue: true,
      }),
    ],
  );

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
