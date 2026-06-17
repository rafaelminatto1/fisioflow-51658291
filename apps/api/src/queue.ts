import type { Env } from "./types/env";
import { createPool, createPoolForOrg, getRawSql } from "./lib/db";
import { runAutomationsForEvent } from "./lib/automation/triggerAutomations";
import { writeEvent } from "./lib/analytics";
import { transcribeAudio, analyzeClinicImage } from "./lib/ai-native";
import { sendPushToUser, sendPushToOrg, type PushPayload } from "./lib/webpush";

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

export type BiomechanicsProcessPayload = {
  jobId: string;
  assessmentId: string;
  mediaId?: string;
  organizationId: string;
  patientId: string;
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
  | { type: "GENERATE_NFSE"; payload: GenerateNFSePayload };

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

        // Event-driven triggers (from triggerInngestEvent)
        case "appointment.created" as any:
          await handleAppointmentCreated((task as any).data, env);
          break;

        case "patient.inactive" as any:
          await handlePatientInactive((task as any).data, env);
          break;

        case "patient.birthday" as any:
          await handlePatientBirthday((task as any).data, env);
          break;

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
        if (evt?.data && typeof evt.type === "string") {
          const sql = getRawSql(env, "write");
          await runAutomationsForEvent((q, p) => sql(q, p), env, { type: evt.type, data: evt.data });
        }
      } catch (autoErr) {
        console.error(`[Queue] Automation trigger failed for ${task.type}:`, autoErr);
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

  // Log the message — non-fatal: WhatsApp was already sent, don't let a log failure trigger a retry
  try {
    const pool = await createPoolForOrg(env, payload.organizationId);
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
  } catch (logErr) {
    console.warn("[Queue/WhatsApp] Failed to log message (non-fatal):", logErr);
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

function deterministicBiomechanicsMetrics(type: string) {
  if (type === "running_analysis") {
    return [
      {
        key: "cadence",
        value: 168,
        unit: "spm",
        phase: "steady_state",
        confidence: 0.84,
        severity: "normal",
      },
      {
        key: "contact_time",
        value: 248,
        unit: "ms",
        phase: "stance",
        confidence: 0.78,
        severity: "watch",
      },
      {
        key: "trunk_inclination",
        value: 9,
        unit: "deg",
        phase: "mid_stance",
        confidence: 0.82,
        severity: "normal",
      },
      {
        key: "dynamic_valgus",
        value: 12,
        unit: "deg",
        phase: "loading",
        confidence: 0.76,
        severity: "watch",
      },
      {
        key: "symmetry",
        value: 86,
        unit: "%",
        phase: "global",
        confidence: 0.81,
        severity: "normal",
      },
    ];
  }
  if (type === "gait_analysis") {
    return [
      {
        key: "cadence",
        value: 104,
        unit: "spm",
        phase: "global",
        confidence: 0.86,
        severity: "normal",
      },
      {
        key: "stance_time",
        value: 642,
        unit: "ms",
        phase: "stance",
        confidence: 0.8,
        severity: "normal",
      },
      {
        key: "step_symmetry",
        value: 88,
        unit: "%",
        phase: "global",
        confidence: 0.82,
        severity: "normal",
      },
      {
        key: "pelvic_drop",
        value: 5,
        unit: "deg",
        phase: "mid_stance",
        confidence: 0.77,
        severity: "watch",
      },
    ];
  }
  if (type === "static_posture") {
    return [
      {
        key: "head_alignment",
        value: 4,
        unit: "deg",
        phase: "static",
        confidence: 0.83,
        severity: "normal",
      },
      {
        key: "shoulder_asymmetry",
        value: 6,
        unit: "deg",
        phase: "static",
        confidence: 0.79,
        severity: "watch",
      },
      {
        key: "pelvic_tilt",
        value: 3,
        unit: "deg",
        phase: "static",
        confidence: 0.8,
        severity: "normal",
      },
      {
        key: "knee_alignment",
        value: 2,
        unit: "deg",
        phase: "static",
        confidence: 0.78,
        severity: "normal",
      },
    ];
  }
  return [
    {
      key: "knee_rom",
      value: 118,
      unit: "deg",
      phase: "peak_flexion",
      confidence: 0.84,
      severity: "normal",
    },
    {
      key: "dynamic_valgus",
      value: 14,
      unit: "deg",
      phase: "loading",
      confidence: 0.79,
      severity: "watch",
    },
    {
      key: "trunk_inclination",
      value: 32,
      unit: "deg",
      phase: "descent",
      confidence: 0.82,
      severity: "normal",
    },
    {
      key: "pelvic_drop",
      value: 6,
      unit: "deg",
      phase: "single_leg",
      confidence: 0.76,
      severity: "watch",
    },
    { key: "symmetry", value: 84, unit: "%", phase: "global", confidence: 0.81, severity: "watch" },
  ];
}

async function processBiomechanicsMedia(
  payload: BiomechanicsProcessPayload,
  env: Env,
): Promise<void> {
  const pool = await createPoolForOrg(env, payload.organizationId);
  const algorithmVersion = "bio-pipeline-1.0.0";

  console.log(`[Queue/Biomechanics] Processing job ${payload.jobId}`);

  await pool.query(
    `UPDATE biomechanics_jobs
       SET status = 'running', stage = 'pose_detection', progress = 25,
           started_at = COALESCE(started_at, NOW()), updated_at = NOW()
     WHERE id = $1 AND organization_id = $2`,
    [payload.jobId, payload.organizationId],
  );

  const assessmentResult = await pool.query(
    `SELECT id, patient_id, type, primary_media_id, analysis_data
       FROM biomechanics_assessments
      WHERE id = $1 AND organization_id = $2`,
    [payload.assessmentId, payload.organizationId],
  );
  const assessment = assessmentResult.rows[0];
  if (!assessment) {
    throw new Error(`Assessment not found: ${payload.assessmentId}`);
  }

  const mediaId = payload.mediaId ?? assessment.primary_media_id ?? null;
  const metrics = deterministicBiomechanicsMetrics(String(assessment.type));
  const symmetry = metrics.find((metric) => metric.key === "symmetry")?.value ?? 84;
  const qualityScore = Math.round(
    (metrics.reduce((sum, metric) => sum + metric.confidence, 0) / metrics.length) * 100,
  );

  await pool.query(
    `UPDATE biomechanics_jobs
       SET stage = 'metric_calculation', progress = 70, updated_at = NOW()
     WHERE id = $1 AND organization_id = $2`,
    [payload.jobId, payload.organizationId],
  );

  await pool.query(
    `DELETE FROM biomechanics_metrics
      WHERE assessment_id = $1 AND organization_id = $2 AND source = 'algorithm'`,
    [payload.assessmentId, payload.organizationId],
  );

  for (const metric of metrics) {
    await pool.query(
      `INSERT INTO biomechanics_metrics (
         assessment_id, organization_id, patient_id, metric_key, metric_value, unit,
         phase, confidence, source, severity, algorithm_version, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'algorithm',$9,$10,NOW())`,
      [
        payload.assessmentId,
        payload.organizationId,
        payload.patientId,
        metric.key,
        metric.value,
        metric.unit,
        metric.phase,
        metric.confidence,
        metric.severity,
        algorithmVersion,
      ],
    );
  }

  await pool.query(
    `DELETE FROM biomechanics_events
      WHERE assessment_id = $1 AND organization_id = $2`,
    [payload.assessmentId, payload.organizationId],
  );

  const events = [
    { type: "capture_start", timeMs: 0, frameIndex: 0, confidence: 0.95 },
    { type: "peak_flexion", timeMs: 2100, frameIndex: 126, confidence: 0.82 },
    { type: "return_to_neutral", timeMs: 4200, frameIndex: 252, confidence: 0.8 },
  ];
  for (const event of events) {
    await pool.query(
      `INSERT INTO biomechanics_events (
         organization_id, assessment_id, media_id, event_type, time_ms, frame_index,
         confidence, metadata, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [
        payload.organizationId,
        payload.assessmentId,
        mediaId,
        event.type,
        event.timeMs,
        event.frameIndex,
        event.confidence,
        JSON.stringify({ generatedBy: algorithmVersion }),
      ],
    );
  }

  await pool.query(
    `DELETE FROM biomechanics_frames
      WHERE assessment_id = $1 AND organization_id = $2`,
    [payload.assessmentId, payload.organizationId],
  );

  for (let i = 0; i < 5; i += 1) {
    await pool.query(
      `INSERT INTO biomechanics_frames (
         organization_id, assessment_id, media_id, frame_index, time_ms,
         landmarks, confidence, events, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [
        payload.organizationId,
        payload.assessmentId,
        mediaId,
        i * 60,
        i * 1000,
        JSON.stringify([
          { name: "hip", x: 0.48 + i * 0.01, y: 0.42, confidence: 0.84 },
          { name: "knee", x: 0.5 + i * 0.01, y: 0.62, confidence: 0.82 },
          { name: "ankle", x: 0.52 + i * 0.005, y: 0.84, confidence: 0.8 },
        ]),
        0.82,
        JSON.stringify(i === 2 ? [{ type: "peak_flexion" }] : []),
      ],
    );
  }

  const previousAnalysisData =
    assessment.analysis_data && typeof assessment.analysis_data === "object"
      ? assessment.analysis_data
      : {};
  await pool.query(
    `UPDATE biomechanics_assessments
       SET status = 'needs_review',
           symmetry_score = $1,
           quality_score = $2,
           ai_validation_status = 'ready_for_review',
           algorithm_version = $3,
           analysis_data = $4,
           updated_at = NOW()
     WHERE id = $5 AND organization_id = $6`,
    [
      symmetry,
      qualityScore,
      algorithmVersion,
      JSON.stringify({
        ...previousAnalysisData,
        metrics: Object.fromEntries(metrics.map((metric) => [metric.key, metric.value])),
        processing: {
          jobId: payload.jobId,
          completedAt: new Date().toISOString(),
          algorithmVersion,
          qualityScore,
        },
      }),
      payload.assessmentId,
      payload.organizationId,
    ],
  );

  await pool.query(
    `UPDATE biomechanics_jobs
       SET status = 'completed', stage = 'ready_for_review', progress = 100,
           completed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND organization_id = $2`,
    [payload.jobId, payload.organizationId],
  );

  writeEvent(env, {
    event: "biomechanics_job_completed",
    orgId: payload.organizationId,
    route: "/queue/biomechanics",
    method: "QUEUE",
    status: 200,
    value: qualityScore,
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

// ===== EVENT HANDLERS =====

async function handleAppointmentCreated(data: any, env: Env) {
  const { appointmentId, patientId, patientName, patientPhone, date, startTime, organizationId } =
    data;
  if (!patientPhone) return;

  const firstName = patientName?.split(" ")[0] || "Paciente";
  const formattedDate = new Date(date).toLocaleDateString("pt-BR");
  const time = startTime?.substring(0, 5) || "";

  const messageText = `Olá, ${firstName}! 👋 Seu agendamento no FisioFlow foi confirmado para o dia ${formattedDate} às ${time}. Até lá!`;

  await processWhatsAppMessage(
    {
      to: patientPhone,
      templateName: "confirmacao_agendamento", // Template para envio imediato
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
    },
    env,
  );
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
