import { Hono } from "hono";
import { asc, eq, and, desc, or, isNull } from "drizzle-orm";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createDb } from "../lib/db";
import { R2Service } from "../lib/storage/R2Service";
import {
  biomechanicsAnnotations,
  biomechanicsAssessments,
  biomechanicsEvents,
  biomechanicsFrames,
  biomechanicsJobs,
  biomechanicsMedia,
  biomechanicsMetrics,
  biomechanicsProtocols,
  biomechanicsReviewActions,
  patients,
} from "@fisioflow/db";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
const QUICK_ACTIONS_BASE = "https://browser.ai.cloudflare.com/api/v1";

type AssessmentRow = typeof biomechanicsAssessments.$inferSelect;
type ProtocolRow = typeof biomechanicsProtocols.$inferSelect;

type ExtractedMetric = {
  key: string;
  label: string;
  unit: string;
  value: number;
  lowerIsBetter: boolean;
};

const METRIC_LABELS: Record<string, { label: string; unit: string; lowerIsBetter?: boolean }> = {
  knee_rom: { label: "ROM joelho", unit: "deg" },
  knee_flexion: { label: "Flexão de joelho", unit: "deg" },
  hip_flexion: { label: "Flexão de quadril", unit: "deg" },
  ankle_dorsiflexion: { label: "Dorsiflexão", unit: "deg" },
  trunk_inclination: { label: "Inclinação de tronco", unit: "deg", lowerIsBetter: true },
  dynamic_valgus: { label: "Valgo dinâmico", unit: "deg", lowerIsBetter: true },
  symmetry: { label: "Simetria E/D", unit: "%" },
  pain: { label: "Dor EVA", unit: "/10", lowerIsBetter: true },
};

const DEFAULT_ALGORITHM_VERSION = "bio-pipeline-1.0.0";

function toBiomechanicsAssessmentType(value: unknown): "static_posture" | "gait_analysis" | "running_analysis" | "functional_movement" {
  if (value === "static_posture" || value === "gait_analysis" || value === "running_analysis" || value === "functional_movement") {
    return value;
  }
  return "functional_movement";
}

function normalizeView(value: unknown) {
  const view = String(value ?? "sagittal").toLowerCase();
  if (["frontal", "sagittal", "posterior", "superior"].includes(view)) return view;
  return "sagittal";
}

function publicOrTenantProtocolFilter(userOrgId: string) {
  return or(isNull(biomechanicsProtocols.organizationId), eq(biomechanicsProtocols.organizationId, userOrgId));
}

function r2BiomechanicsKey(params: {
  organizationId: string;
  patientId: string;
  assessmentId: string;
  mediaId: string;
  filename?: string;
}) {
  const rawFilename = params.filename?.trim() || `${params.mediaId}.mp4`;
  const filename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160);
  return `orgs/${params.organizationId}/patients/${params.patientId}/videos/biomechanics/${params.assessmentId}/${filename}`;
}

function r2PublicUrl(env: Env, key: string) {
  const baseUrl = env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("R2_PUBLIC_URL is required to publish biomechanics media URLs");
  }
  return `${baseUrl}/${key}`;
}

function safeJson(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, any>;
}

function metricInfo(key: string) {
  return METRIC_LABELS[key] ?? {
    label: key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase()),
    unit: "",
  };
}

function normalizeMetricKey(rawKey: string) {
  const key = rawKey.toLowerCase();
  if (key.includes("valgo")) return "dynamic_valgus";
  if (key.includes("tronco") || key.includes("trunk")) return "trunk_inclination";
  if (key.includes("simetr")) return "symmetry";
  if (key.includes("dor") || key.includes("pain") || key.includes("vas") || key.includes("eva")) return "pain";
  if (key.includes("tornozelo") || key.includes("ankle") || key.includes("dors")) return "ankle_dorsiflexion";
  if (key.includes("quadril") || key.includes("hip")) return "hip_flexion";
  if (key.includes("joelho") || key.includes("knee")) return key.includes("rom") ? "knee_rom" : "knee_flexion";
  return key.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function numberFrom(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return numberFrom(record.value ?? record.angle ?? record.score);
  }
  return null;
}

function extractMetrics(assessment: AssessmentRow): ExtractedMetric[] {
  const analysisData = safeJson(assessment.analysisData);
  const byKey = new Map<string, ExtractedMetric>();

  const put = (rawKey: string, rawValue: unknown, unitOverride?: string) => {
    const value = numberFrom(rawValue);
    if (value == null) return;
    const key = normalizeMetricKey(rawKey);
    const info = metricInfo(key);
    byKey.set(key, {
      key,
      label: info.label,
      unit: unitOverride ?? info.unit,
      value,
      lowerIsBetter: Boolean(info.lowerIsBetter),
    });
  };

  const metrics = safeJson(analysisData.metrics);
  Object.entries(metrics).forEach(([key, value]) => put(key, value));

  if (Array.isArray(analysisData.angles)) {
    analysisData.angles.forEach((angle: any) => put(angle.joint ?? angle.label ?? "angle", angle.angle, "deg"));
  }

  if (Array.isArray(analysisData.symmetries)) {
    analysisData.symmetries.forEach((symmetry: any) =>
      put(symmetry.joint ? `${symmetry.joint}_symmetry` : "symmetry", symmetry.percentage ?? symmetry.diff, "%"),
    );
  }

  put("pain", analysisData.pain ?? analysisData.painScale ?? analysisData.vas ?? analysisData.eva);

  return Array.from(byKey.values());
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function generatePdfBrowserRun(env: Env, html: string): Promise<Uint8Array> {
  const browser = env?.BROWSER;
  if (!browser || !browser.pdf) {
    const response = await fetch(`${QUICK_ACTIONS_BASE}/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html,
        options: {
          format: "A4",
          printBackground: true,
          margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Quick Actions PDF failed: ${response.status}`);
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  return await browser.pdf({
    html,
    options: {
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
    },
  });
}

function buildComparisonPayload(from: AssessmentRow | null, to: AssessmentRow) {
  const fromMetrics = new Map((from ? extractMetrics(from) : []).map((metric) => [metric.key, metric]));
  const toMetrics = extractMetrics(to);

  const metrics = toMetrics.map((current) => {
    const previous = fromMetrics.get(current.key);
    const delta = previous ? current.value - previous.value : null;
    const improved =
      delta == null
        ? null
        : current.lowerIsBetter
          ? delta < 0
          : delta > 0;

    return {
      key: current.key,
      label: current.label,
      unit: current.unit,
      fromValue: previous?.value ?? null,
      toValue: current.value,
      delta,
      direction: improved == null ? "new" : improved ? "improved" : delta === 0 ? "stable" : "worse",
      lowerIsBetter: current.lowerIsBetter,
    };
  });

  return {
    from: from
      ? {
          id: from.id,
          date: from.createdAt,
          label: formatDate(from.createdAt),
          type: from.type,
          mediaUrl: from.mediaUrl,
          thumbnailUrl: from.thumbnailUrl,
        }
      : null,
    to: {
      id: to.id,
      date: to.createdAt,
      label: formatDate(to.createdAt),
      type: to.type,
      mediaUrl: to.mediaUrl,
      thumbnailUrl: to.thumbnailUrl,
    },
    metrics,
  };
}

function buildBiomechanicsReportHtml(params: {
  assessment: AssessmentRow;
  patientName: string;
  comparison: ReturnType<typeof buildComparisonPayload>;
  reportHash: string;
  annotations?: Array<{ tool: string; label: string | null; timeMs: number | null; frameIndex: number | null }>;
}) {
  const { assessment, patientName, comparison, reportHash, annotations = [] } = params;
  const generatedAt = new Date().toLocaleString("pt-BR");
  
  // Extract symmetry score from analysis data or fallback
  const currentAnalysisData = safeJson(assessment.analysisData);
  const symmetryScore = Number(assessment.symmetryScore || currentAnalysisData.symmetryScore || 84);
  const deviation = Math.abs(50 - symmetryScore);
  const symStatus = deviation < 5 ? "Excelente" : deviation < 15 ? "Moderado" : "Desvio Crítico";
  const symColor = deviation < 5 ? "#10b981" : deviation < 15 ? "#f59e0b" : "#ef4444";

  const metricsRows = comparison.metrics
    .map((metric) => {
      const delta =
        metric.delta == null
          ? "novo"
          : `${metric.delta > 0 ? "+" : ""}${metric.delta.toFixed(1)}${metric.unit}`;
      return `<tr>
        <td>${escapeHtml(metric.label)}</td>
        <td>${metric.fromValue == null ? "—" : `${metric.fromValue}${escapeHtml(metric.unit)}`}</td>
        <td>${metric.toValue}${escapeHtml(metric.unit)}</td>
        <td class="${metric.direction}">${escapeHtml(delta)}</td>
      </tr>`;
    })
    .join("");
  const annotationRows = annotations.length
    ? annotations
        .map(
          (annotation) => `<tr>
        <td>${escapeHtml(annotation.tool)}</td>
        <td>${annotation.timeMs == null ? "—" : `${Math.round(annotation.timeMs / 1000)}s`}</td>
        <td>${annotation.frameIndex ?? "—"}</td>
        <td>${escapeHtml(annotation.label || "Sem rótulo")}</td>
      </tr>`,
        )
        .join("")
    : '<tr><td colspan="4">Nenhuma anotação manual registrada.</td></tr>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Laudo Biomecânico - ${escapeHtml(patientName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #172033; background: #fff; }
    .hero { padding: 28px 32px; background: #08345c; color: white; }
    .eyebrow { font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; opacity: .78; }
    h1 { margin: 6px 0 4px; font-size: 24px; }
    .subtitle { font-size: 12px; opacity: .86; }
    .content { padding: 26px 32px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 22px; }
    .card { border: 1px solid #dbe4ef; border-radius: 10px; padding: 12px; background: #f8fbff; }
    .label { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .7px; }
    .value { margin-top: 5px; font-size: 14px; font-weight: 700; }
    .section { margin-top: 20px; }
    h2 { color: #0a5fa8; font-size: 14px; text-transform: uppercase; letter-spacing: .7px; border-bottom: 2px solid #0a5fa8; padding-bottom: 6px; }
    p { font-size: 12px; line-height: 1.65; white-space: pre-wrap; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
    th { text-align: left; background: #0a5fa8; color: #fff; padding: 8px; }
    td { padding: 8px; border-bottom: 1px solid #e6edf5; }
    .improved { color: #047857; font-weight: 700; }
    .worse { color: #b45309; font-weight: 700; }
    .stable, .new { color: #475569; font-weight: 700; }
    .verdict { background: #ecfdf5; border: 1px solid #a7f3d0; color: #064e3b; border-radius: 10px; padding: 12px 14px; }
    .footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #dbe4ef; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
    .symmetry-box { margin-top: 20px; padding: 16px; background: #f8fbff; border: 1px solid #dbe4ef; border-radius: 10px; }
    .sym-head { display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: bold; font-size: 14px; }
    .sym-track { height: 12px; background: #e2e8f0; border-radius: 6px; position: relative; display: flex; overflow: hidden; }
    .sym-pointer { position: absolute; top: -4px; width: 4px; height: 20px; background: #1e293b; border-radius: 2px; z-index: 10; }
  </style>
</head>
<body>
  <div class="hero">
    <div class="eyebrow">FisioFlow Biomecânica</div>
    <h1>Laudo biomecânico comparativo</h1>
    <div class="subtitle">Gerado em ${escapeHtml(generatedAt)} · hash ${escapeHtml(reportHash.slice(0, 12))}</div>
  </div>
  <div class="content">
    <div class="grid">
      <div class="card"><div class="label">Paciente</div><div class="value">${escapeHtml(patientName)}</div></div>
      <div class="card"><div class="label">Avaliação</div><div class="value">${escapeHtml(comparison.to.label)}</div></div>
      <div class="card"><div class="label">Comparado com</div><div class="value">${escapeHtml(comparison.from?.label ?? "Sem avaliação anterior")}</div></div>
    </div>

    <div class="symmetry-box">
      <div class="sym-head">
        <span>Simetria L/R</span>
        <span style="color: ${symColor}">${symStatus}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 12px; font-weight: bold;">E</span>
        <div style="flex: 1; position: relative;">
          <div class="sym-track">
            <div style="flex: 3; background: #fca5a5;"></div>
            <div style="flex: 1.5; background: #fcd34d;"></div>
            <div style="flex: 1; background: #6ee7b7;"></div>
            <div style="flex: 1.5; background: #fcd34d;"></div>
            <div style="flex: 3; background: #fca5a5;"></div>
          </div>
          <div class="sym-pointer" style="left: calc(${symmetryScore}% - 2px);"></div>
        </div>
        <span style="font-size: 12px; font-weight: bold;">D</span>
      </div>
    </div>

    <div class="section">
      <h2>Resumo interpretativo</h2>
      <div class="verdict">
        ${comparison.metrics.filter((m) => m.direction === "improved").length} métricas melhoraram,
        ${comparison.metrics.filter((m) => m.direction === "worse").length} exigem atenção e
        ${comparison.metrics.filter((m) => m.direction === "stable").length} permaneceram estáveis.
      </div>
    </div>
    <div class="section">
      <h2>Comparação entre datas</h2>
      <table>
        <thead><tr><th>Métrica</th><th>Anterior</th><th>Atual</th><th>Variação</th></tr></thead>
        <tbody>${metricsRows || '<tr><td colspan="4">Sem métricas estruturadas para comparar.</td></tr>'}</tbody>
      </table>
    </div>
    <div class="section">
      <h2>Observações clínicas</h2>
      <p>${escapeHtml(assessment.observations || "Nenhuma observação registrada.")}</p>
    </div>
    <div class="section">
      <h2>Conclusão e conduta</h2>
      <p>${escapeHtml(assessment.conclusions || "Conclusão não registrada.")}</p>
    </div>
    <div class="section">
      <h2>Anotações do workbench</h2>
      <table>
        <thead><tr><th>Ferramenta</th><th>Tempo</th><th>Frame</th><th>Observação</th></tr></thead>
        <tbody>${annotationRows}</tbody>
      </table>
    </div>
    <div class="footer">
      <span>Documento armazenado na nuvem FisioFlow</span>
      <span>${escapeHtml(assessment.id)}</span>
    </div>
  </div>
</body>
</html>`;
}

// GET /api/biomechanics/dashboard — operational hub for the professional app
app.get("/dashboard", requireAuth, async (c) => {
  const user = c.get("user");
  const db = await createDb(c.env, "read");

  const [jobs, recentAssessments] = await Promise.all([
    db
      .select()
      .from(biomechanicsJobs)
      .where(eq(biomechanicsJobs.organizationId, user.organizationId))
      .orderBy(desc(biomechanicsJobs.createdAt))
      .limit(30),
    db
      .select()
      .from(biomechanicsAssessments)
      .where(eq(biomechanicsAssessments.organizationId, user.organizationId))
      .orderBy(desc(biomechanicsAssessments.createdAt))
      .limit(12),
  ]);

  const counts = jobs.reduce(
    (acc, job) => {
      const status = job.status || "unknown";
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return c.json({
    data: {
      counts: {
        queued: counts.queued ?? 0,
        processing: (counts.running ?? 0) + (counts.waiting_external_model ?? 0),
        needsReview: recentAssessments.filter((assessment) => assessment.status === "needs_review").length,
        failed: counts.failed ?? 0,
      },
      jobs,
      recentAssessments,
    },
  });
});

// GET /api/biomechanics/protocols — system + tenant protocols
app.get("/protocols", requireAuth, async (c) => {
  const user = c.get("user");
  const category = c.req.query("category");
  const db = await createDb(c.env, "read");

  const filters = [publicOrTenantProtocolFilter(user.organizationId)];
  if (category && category !== "all") filters.push(eq(biomechanicsProtocols.category, category));

  const protocols = await db
    .select()
    .from(biomechanicsProtocols)
    .where(and(...filters))
    .orderBy(asc(biomechanicsProtocols.category), asc(biomechanicsProtocols.name));

  return c.json({ data: protocols });
});

// POST /api/biomechanics/protocols — custom tenant protocol
app.post("/protocols", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const db = await createDb(c.env);
  const name = String(body.name ?? "").trim();
  const category = String(body.category ?? "").trim();
  if (!name) return c.json({ error: "Nome do protocolo é obrigatório" }, 400);
  if (!category) return c.json({ error: "Categoria do protocolo é obrigatória" }, 400);

  const [protocol] = await db
    .insert(biomechanicsProtocols)
    .values({
      organizationId: user.organizationId,
      slug: String(body.slug ?? name)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      name,
      category,
      description: body.description ?? null,
      assessmentType: toBiomechanicsAssessmentType(body.assessmentType),
      captureRequirements: body.captureRequirements ?? {},
      metricDefinitions: body.metricDefinitions ?? [],
      qualityRules: body.qualityRules ?? {},
      progressionGates: body.progressionGates ?? [],
      redFlags: body.redFlags ?? [],
      evidenceRefs: body.evidenceRefs ?? [],
      isSystem: false,
      version: body.version ?? "1.0.0",
    })
    .returning();

  return c.json({ data: protocol }, 201);
});

// GET /api/biomechanics/protocols/:id
app.get("/protocols/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = await createDb(c.env, "read");
  const [protocol] = await db
    .select()
    .from(biomechanicsProtocols)
    .where(and(eq(biomechanicsProtocols.id, id), publicOrTenantProtocolFilter(user.organizationId)));
  if (!protocol) return c.json({ error: "Protocolo não encontrado" }, 404);
  return c.json({ data: protocol });
});

// POST /api/biomechanics/captures — create assessment + media + initial job
app.post("/captures", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const db = await createDb(c.env);
  const patientId = String(body.patientId ?? "").trim();
  if (!patientId) return c.json({ error: "Paciente é obrigatório" }, 400);

  const [patient] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.organizationId, user.organizationId)));
  if (!patient) return c.json({ error: "Paciente não encontrado nesta organização" }, 404);

  let protocol: ProtocolRow | undefined;
  if (body.protocolId) {
    [protocol] = await db
      .select()
      .from(biomechanicsProtocols)
      .where(and(eq(biomechanicsProtocols.id, String(body.protocolId)), publicOrTenantProtocolFilter(user.organizationId)));
    if (!protocol) return c.json({ error: "Protocolo não encontrado" }, 404);
  }

  const [assessment] = await db
    .insert(biomechanicsAssessments)
    .values({
      patientId,
      organizationId: user.organizationId,
      professionalId: user.uid,
      protocolId: protocol?.id ?? null,
      type: toBiomechanicsAssessmentType(protocol?.assessmentType ?? body.type),
      status: "draft",
      mediaUrl: body.mediaUrl ?? "pending://biomechanics-upload",
      thumbnailUrl: body.thumbnailUrl ?? null,
      captureContext: {
        protocolSlug: protocol?.slug,
        view: normalizeView(body.view),
        attempt: Number(body.attempt ?? 1),
        checklist: body.checklist ?? {},
        source: body.source ?? "professional-app",
      },
      analysisData: {
        metrics: {},
        protocol: protocol
          ? { id: protocol.id, slug: protocol.slug, name: protocol.name, category: protocol.category }
          : null,
      },
      trajectoryData: [],
      aiValidationStatus: "pending",
      algorithmVersion: DEFAULT_ALGORITHM_VERSION,
    })
    .returning();

  const [media] = await db
    .insert(biomechanicsMedia)
    .values({
      organizationId: user.organizationId,
      patientId,
      assessmentId: assessment.id,
      mediaType: body.mediaType ?? "video",
      view: normalizeView(body.view),
      durationMs: body.durationMs ?? null,
      fps: body.fps ? String(body.fps) : null,
      width: body.width ?? null,
      height: body.height ?? null,
      contentType: body.contentType ?? "video/mp4",
      sizeBytes: body.sizeBytes ?? null,
      metadata: body.metadata ?? {},
    })
    .returning();

  const [job] = await db
    .insert(biomechanicsJobs)
    .values({
      organizationId: user.organizationId,
      patientId,
      assessmentId: assessment.id,
      mediaId: media.id,
      status: "queued",
      stage: "ingest",
      progress: 0,
      createdBy: user.uid,
      algorithmVersion: DEFAULT_ALGORITHM_VERSION,
    })
    .returning();

  const [updatedAssessment] = await db
    .update(biomechanicsAssessments)
    .set({
      primaryMediaId: media.id,
      jobId: job.id,
      updatedAt: new Date(),
    })
    .where(and(eq(biomechanicsAssessments.id, assessment.id), eq(biomechanicsAssessments.organizationId, user.organizationId)))
    .returning();

  return c.json({ data: { assessment: updatedAssessment, media, job, protocol: protocol ?? null } }, 201);
});

// POST /api/biomechanics/:id/media/upload-url
app.post("/:id/media/upload-url", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const db = await createDb(c.env);

  const [assessment] = await db
    .select()
    .from(biomechanicsAssessments)
    .where(and(eq(biomechanicsAssessments.id, id), eq(biomechanicsAssessments.organizationId, user.organizationId)));
  if (!assessment) return c.json({ error: "Avaliação não encontrada" }, 404);

  const mediaId = String(body.mediaId ?? assessment.primaryMediaId ?? "");
  const [media] = mediaId
    ? await db
        .select()
        .from(biomechanicsMedia)
        .where(and(eq(biomechanicsMedia.id, mediaId), eq(biomechanicsMedia.organizationId, user.organizationId)))
    : [];
  if (!media) return c.json({ error: "Mídia não encontrada" }, 404);

  const key = r2BiomechanicsKey({
    organizationId: user.organizationId,
    patientId: assessment.patientId,
    assessmentId: assessment.id,
    mediaId: media.id,
    filename: body.filename ? String(body.filename) : undefined,
  });
  const contentType = String(body.contentType ?? media.contentType ?? "video/mp4");
  const uploadUrl = await new R2Service(c.env).getUploadUrl(key, contentType);

  const [updatedMedia] = await db
    .update(biomechanicsMedia)
    .set({ r2Key: key, contentType, updatedAt: new Date() })
    .where(and(eq(biomechanicsMedia.id, media.id), eq(biomechanicsMedia.organizationId, user.organizationId)))
    .returning();

  return c.json({ data: { uploadUrl, key, media: updatedMedia } });
});

// POST /api/biomechanics/:id/media/complete
app.post("/:id/media/complete", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const db = await createDb(c.env);
  const mediaId = String(body.mediaId ?? "");

  const [assessment] = await db
    .select()
    .from(biomechanicsAssessments)
    .where(and(eq(biomechanicsAssessments.id, id), eq(biomechanicsAssessments.organizationId, user.organizationId)));
  if (!assessment) return c.json({ error: "Avaliação não encontrada" }, 404);

  const [media] = await db
    .update(biomechanicsMedia)
    .set({
      durationMs: body.durationMs ?? undefined,
      fps: body.fps ? String(body.fps) : undefined,
      width: body.width ?? undefined,
      height: body.height ?? undefined,
      sizeBytes: body.sizeBytes ?? undefined,
      qualityScore: body.qualityScore ? String(body.qualityScore) : undefined,
      metadata: body.metadata ?? undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(biomechanicsMedia.id, mediaId || String(assessment.primaryMediaId)), eq(biomechanicsMedia.organizationId, user.organizationId)))
    .returning();
  if (!media) return c.json({ error: "Mídia não encontrada" }, 404);
  if (media.r2Key && !c.env.R2_PUBLIC_URL) {
    return c.json({ error: "R2_PUBLIC_URL não configurado para publicar mídia de biomecânica" }, 500);
  }

  await db
    .update(biomechanicsAssessments)
    .set({
      status: "uploaded",
      mediaUrl: media.r2Key ? r2PublicUrl(c.env, media.r2Key) : assessment.mediaUrl,
      qualityScore: media.qualityScore,
      updatedAt: new Date(),
    })
    .where(and(eq(biomechanicsAssessments.id, id), eq(biomechanicsAssessments.organizationId, user.organizationId)));

  return c.json({ data: { media } });
});

// POST /api/biomechanics/:id/process
app.post("/:id/process", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = await createDb(c.env);
  const [assessment] = await db
    .select()
    .from(biomechanicsAssessments)
    .where(and(eq(biomechanicsAssessments.id, id), eq(biomechanicsAssessments.organizationId, user.organizationId)));
  if (!assessment) return c.json({ error: "Avaliação não encontrada" }, 404);

  const [latestJob] = await db
    .select()
    .from(biomechanicsJobs)
    .where(and(eq(biomechanicsJobs.assessmentId, assessment.id), eq(biomechanicsJobs.organizationId, user.organizationId)))
    .orderBy(desc(biomechanicsJobs.createdAt))
    .limit(1);

  if (latestJob && ["queued", "running"].includes(latestJob.status)) {
    return c.json({ data: { job: latestJob } });
  }

  const [job] = await db
    .insert(biomechanicsJobs)
    .values({
      organizationId: user.organizationId,
      patientId: assessment.patientId,
      assessmentId: assessment.id,
      mediaId: assessment.primaryMediaId,
      status: "queued",
      stage: "ingest",
      progress: 0,
      createdBy: user.uid,
      algorithmVersion: DEFAULT_ALGORITHM_VERSION,
    })
    .returning();

  await db
    .update(biomechanicsJobs)
    .set({ status: "queued", stage: "ingest", progress: 0, errorCode: null, errorMessage: null, updatedAt: new Date() })
    .where(and(eq(biomechanicsJobs.id, job.id), eq(biomechanicsJobs.organizationId, user.organizationId)));

  await db
    .update(biomechanicsAssessments)
    .set({ status: "queued", jobId: job.id, updatedAt: new Date() })
    .where(and(eq(biomechanicsAssessments.id, id), eq(biomechanicsAssessments.organizationId, user.organizationId)));

  const processPayload = {
    jobId: job.id,
    assessmentId: assessment.id,
    mediaId: job.mediaId ?? assessment.primaryMediaId ?? undefined,
    patientId: assessment.patientId,
    organizationId: user.organizationId,
  };

  if (c.env.WORKFLOW_BIOMECHANICS_ANALYSIS) {
    await c.env.WORKFLOW_BIOMECHANICS_ANALYSIS.create({
      id: `biomechanics-${job.id}`,
      params: processPayload,
    });
  } else {
    await c.env.BACKGROUND_QUEUE.send({
      type: "PROCESS_BIOMECHANICS_MEDIA",
      payload: processPayload,
    } as any);
  }

  return c.json({ data: { job: { ...job, status: "queued", stage: "ingest", progress: 0 } } });
});

// GET /api/biomechanics/:id/job
app.get("/:id/job", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = await createDb(c.env, "read");
  const jobs = await db
    .select()
    .from(biomechanicsJobs)
    .where(and(eq(biomechanicsJobs.assessmentId, id), eq(biomechanicsJobs.organizationId, user.organizationId)))
    .orderBy(desc(biomechanicsJobs.createdAt))
    .limit(1);
  if (!jobs[0]) return c.json({ error: "Job não encontrado" }, 404);
  return c.json({ data: jobs[0] });
});

// GET /api/biomechanics/:id/workbench
app.get("/:id/workbench", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = await createDb(c.env, "read");
  const [assessment] = await db
    .select()
    .from(biomechanicsAssessments)
    .where(and(eq(biomechanicsAssessments.id, id), eq(biomechanicsAssessments.organizationId, user.organizationId)));
  if (!assessment) return c.json({ error: "Avaliação não encontrada" }, 404);

  const [media, jobs, metrics, frames, events, annotations] = await Promise.all([
    db.select().from(biomechanicsMedia).where(and(eq(biomechanicsMedia.assessmentId, id), eq(biomechanicsMedia.organizationId, user.organizationId))),
    db.select().from(biomechanicsJobs).where(and(eq(biomechanicsJobs.assessmentId, id), eq(biomechanicsJobs.organizationId, user.organizationId))).orderBy(desc(biomechanicsJobs.createdAt)),
    db.select().from(biomechanicsMetrics).where(and(eq(biomechanicsMetrics.assessmentId, id), eq(biomechanicsMetrics.organizationId, user.organizationId))).orderBy(asc(biomechanicsMetrics.metricKey)),
    db.select().from(biomechanicsFrames).where(and(eq(biomechanicsFrames.assessmentId, id), eq(biomechanicsFrames.organizationId, user.organizationId))).orderBy(asc(biomechanicsFrames.frameIndex)).limit(120),
    db.select().from(biomechanicsEvents).where(and(eq(biomechanicsEvents.assessmentId, id), eq(biomechanicsEvents.organizationId, user.organizationId))).orderBy(asc(biomechanicsEvents.timeMs)),
    db.select().from(biomechanicsAnnotations).where(and(eq(biomechanicsAnnotations.assessmentId, id), eq(biomechanicsAnnotations.organizationId, user.organizationId))).orderBy(asc(biomechanicsAnnotations.createdAt)),
  ]);

  return c.json({ data: { assessment, media, jobs, metrics, frames, events, annotations } });
});

// POST /api/biomechanics/:id/annotations
app.post("/:id/annotations", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = await createDb(c.env);
  const [assessment] = await db
    .select()
    .from(biomechanicsAssessments)
    .where(and(eq(biomechanicsAssessments.id, id), eq(biomechanicsAssessments.organizationId, user.organizationId)));
  if (!assessment) return c.json({ error: "Avaliação não encontrada" }, 404);

  const [annotation] = await db
    .insert(biomechanicsAnnotations)
    .values({
      organizationId: user.organizationId,
      assessmentId: id,
      mediaId: body.mediaId ?? assessment.primaryMediaId ?? null,
      frameIndex: body.frameIndex ?? null,
      timeMs: body.timeMs ?? null,
      tool: body.tool ?? "note",
      geometry: body.geometry ?? {},
      label: body.label ?? null,
      createdBy: user.uid,
    })
    .returning();

  return c.json({ data: annotation }, 201);
});

// PATCH /api/biomechanics/:id/metrics/:metricId
app.patch("/:id/metrics/:metricId", requireAuth, async (c) => {
  const user = c.get("user");
  const { id, metricId } = c.req.param();
  const body = await c.req.json();
  const db = await createDb(c.env);
  const [metric] = await db
    .update(biomechanicsMetrics)
    .set({
      metricValue: body.metricValue !== undefined ? String(body.metricValue) : undefined,
      unit: body.unit ?? undefined,
      side: body.side ?? undefined,
      phase: body.phase ?? undefined,
      view: body.view ?? undefined,
      confidence: body.confidence !== undefined ? String(body.confidence) : undefined,
      source: "manual",
      severity: body.severity ?? undefined,
      normalRange: body.normalRange ?? undefined,
      algorithmVersion: body.algorithmVersion ?? DEFAULT_ALGORITHM_VERSION,
    })
    .where(
      and(
        eq(biomechanicsMetrics.id, metricId),
        eq(biomechanicsMetrics.assessmentId, id),
        eq(biomechanicsMetrics.organizationId, user.organizationId),
      ),
    )
    .returning();
  if (!metric) return c.json({ error: "Métrica não encontrada" }, 404);
  return c.json({ data: metric });
});

// POST /api/biomechanics/:id/validate
app.post("/:id/validate", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const db = await createDb(c.env);
  const [assessment] = await db
    .select()
    .from(biomechanicsAssessments)
    .where(and(eq(biomechanicsAssessments.id, id), eq(biomechanicsAssessments.organizationId, user.organizationId)));
  if (!assessment) return c.json({ error: "Avaliação não encontrada" }, 404);

  const [updated] = await db
    .update(biomechanicsAssessments)
    .set({
      status: "validated",
      observations: body.observations ?? assessment.observations,
      conclusions: body.conclusions ?? assessment.conclusions,
      validatedBy: user.uid,
      validatedAt: new Date(),
      aiValidationStatus: "validated",
      updatedAt: new Date(),
    })
    .where(and(eq(biomechanicsAssessments.id, id), eq(biomechanicsAssessments.organizationId, user.organizationId)))
    .returning();

  await db.insert(biomechanicsReviewActions).values({
    organizationId: user.organizationId,
    assessmentId: id,
    action: "validate",
    fromStatus: assessment.status,
    toStatus: "validated",
    notes: body.notes ?? null,
    createdBy: user.uid,
  });

  return c.json({ data: updated });
});

// GET /api/biomechanics/patient/:patientId/timeline
app.get("/patient/:patientId/timeline", requireAuth, async (c) => {
  const user = c.get("user");
  const patientId = c.req.param("patientId");
  const db = await createDb(c.env, "read");
  const assessments = await db
    .select()
    .from(biomechanicsAssessments)
    .where(and(eq(biomechanicsAssessments.patientId, patientId), eq(biomechanicsAssessments.organizationId, user.organizationId)))
    .orderBy(desc(biomechanicsAssessments.createdAt));

  return c.json({
    data: assessments.map((assessment) => ({
      id: assessment.id,
      type: assessment.type,
      status: assessment.status,
      protocolId: assessment.protocolId,
      qualityScore: assessment.qualityScore,
      symmetryScore: assessment.symmetryScore,
      createdAt: assessment.createdAt,
      metrics: extractMetrics(assessment),
    })),
  });
});

// Listar avaliações por paciente
app.get("/patient/:patientId", requireAuth, async (c) => {
  const user = c.get("user");
  const patientId = c.req.param("patientId");
  const db = await createDb(c.env);

  const results = await db
    .select()
    .from(biomechanicsAssessments)
    .where(
      and(
        eq(biomechanicsAssessments.patientId, patientId),
        eq(biomechanicsAssessments.organizationId, user.organizationId),
      ),
    )
    .orderBy(desc(biomechanicsAssessments.createdAt));

  return c.json({ data: results });
});

// Evolução das métricas biomecânicas normalizadas do paciente
app.get("/patient/:patientId/metrics/history", requireAuth, async (c) => {
  const user = c.get("user");
  const patientId = c.req.param("patientId");
  const db = await createDb(c.env);

  const results = await db
    .select()
    .from(biomechanicsMetrics)
    .where(
      and(
        eq(biomechanicsMetrics.patientId, patientId),
        eq(biomechanicsMetrics.organizationId, user.organizationId),
      )
    )
    .orderBy(asc(biomechanicsMetrics.createdAt));

  return c.json({ data: results });
});

// Comparar duas avaliações do mesmo paciente. Se IDs não forem enviados, usa a avaliação mais recente e a anterior.
app.get("/patient/:patientId/comparison", requireAuth, async (c) => {
  const user = c.get("user");
  const patientId = c.req.param("patientId");
  const fromAssessmentId = c.req.query("fromAssessmentId");
  const toAssessmentId = c.req.query("toAssessmentId");
  const type = c.req.query("type");
  const db = await createDb(c.env, "read");

  const filters = [
    eq(biomechanicsAssessments.patientId, patientId),
    eq(biomechanicsAssessments.organizationId, user.organizationId),
  ];

  if (type) {
    filters.push(eq(biomechanicsAssessments.type, type as any));
  }

  const assessments = await db
    .select()
    .from(biomechanicsAssessments)
    .where(and(...filters))
    .orderBy(desc(biomechanicsAssessments.createdAt));

  if (assessments.length === 0) {
    return c.json({ error: "Nenhuma avaliação biomecânica encontrada para este paciente" }, 404);
  }

  const to =
    (toAssessmentId ? assessments.find((assessment) => assessment.id === toAssessmentId) : null) ??
    assessments[0];
  const from =
    (fromAssessmentId ? assessments.find((assessment) => assessment.id === fromAssessmentId) : null) ??
    assessments.find((assessment) => assessment.id !== to.id) ??
    null;

  const history = assessments
    .slice()
    .reverse()
    .map((assessment) => ({
      assessmentId: assessment.id,
      date: assessment.createdAt,
      label: formatDate(assessment.createdAt),
      type: assessment.type,
      metrics: extractMetrics(assessment),
    }));

  return c.json({
    data: {
      ...buildComparisonPayload(from, to),
      availableAssessments: assessments.map((assessment) => ({
        id: assessment.id,
        label: formatDate(assessment.createdAt),
        date: assessment.createdAt,
        type: assessment.type,
        status: assessment.status,
      })),
      history,
    },
  });
});

// Criar nova avaliação
app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const db = await createDb(c.env);
  const patientId = String(body.patientId ?? "").trim();
  if (!patientId) return c.json({ error: "Paciente é obrigatório" }, 400);
  if (!body.mediaUrl) return c.json({ error: "mediaUrl é obrigatório" }, 400);

  const [patient] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.organizationId, user.organizationId)));
  if (!patient) return c.json({ error: "Paciente não encontrado nesta organização" }, 404);

  const [newAssessment] = await db
    .insert(biomechanicsAssessments)
    .values({
      patientId,
      organizationId: user.organizationId,
      professionalId: user.uid,
      type: toBiomechanicsAssessmentType(body.type),
      mediaUrl: body.mediaUrl,
      thumbnailUrl: body.thumbnailUrl,
      analysisData: body.analysisData || {},
      observations: body.observations,
      conclusions: body.conclusions,
      symmetryScore: body.symmetryScore ? String(body.symmetryScore) : null,
      trajectoryData: body.trajectoryData || [],
      aiValidationStatus: body.aiValidationStatus || 'pending',
    })
    .returning();

  return c.json({ data: newAssessment }, 201);
});

// Atualizar avaliação (dados de análise)
app.patch("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = await createDb(c.env);

  const [updated] = await db
    .update(biomechanicsAssessments)
    .set({
      analysisData: body.analysisData,
      observations: body.observations,
      conclusions: body.conclusions,
      status: body.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(biomechanicsAssessments.id, id),
        eq(biomechanicsAssessments.organizationId, user.organizationId),
      ),
    )
    .returning();

  if (!updated) {
    return c.json({ error: "Avaliação não encontrada" }, 404);
  }

  return c.json({ data: updated });
});

// Detalhes de uma avaliação
app.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = await createDb(c.env);

  const [assessment] = await db
    .select()
    .from(biomechanicsAssessments)
    .where(
      and(
        eq(biomechanicsAssessments.id, id),
        eq(biomechanicsAssessments.organizationId, user.organizationId),
      ),
    );

  if (!assessment) {
    return c.json({ error: "Avaliação não encontrada" }, 404);
  }

  return c.json({ data: assessment });
});

// POST /api/biomechanics/:id/pdf — Create or reuse a cloud PDF report when content did not change.
app.post("/:id/pdf", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as {
    patientName?: string;
    comparisonAssessmentId?: string;
    force?: boolean;
  };
  const db = await createDb(c.env);

  const [assessment] = await db
    .select()
    .from(biomechanicsAssessments)
    .where(
      and(
        eq(biomechanicsAssessments.id, id),
        eq(biomechanicsAssessments.organizationId, user.organizationId),
      ),
    );

  if (!assessment) {
    return c.json({ error: "Avaliação não encontrada" }, 404);
  }

  const [comparisonAssessment] = body.comparisonAssessmentId
    ? await db
        .select()
        .from(biomechanicsAssessments)
        .where(
          and(
            eq(biomechanicsAssessments.id, body.comparisonAssessmentId),
            eq(biomechanicsAssessments.patientId, assessment.patientId),
            eq(biomechanicsAssessments.organizationId, user.organizationId),
          ),
        )
    : await db
        .select()
        .from(biomechanicsAssessments)
        .where(
          and(
            eq(biomechanicsAssessments.patientId, assessment.patientId),
            eq(biomechanicsAssessments.organizationId, user.organizationId),
          ),
        )
        .orderBy(desc(biomechanicsAssessments.createdAt))
        .limit(2)
        .then((rows) => rows.filter((row) => row.id !== assessment.id));

  const currentAnalysisData = safeJson(assessment.analysisData);
  const previousPdf = safeJson(currentAnalysisData._pdf);
  const comparison = buildComparisonPayload(comparisonAssessment ?? null, assessment);
  const annotations = await db
    .select({
      tool: biomechanicsAnnotations.tool,
      label: biomechanicsAnnotations.label,
      timeMs: biomechanicsAnnotations.timeMs,
      frameIndex: biomechanicsAnnotations.frameIndex,
    })
    .from(biomechanicsAnnotations)
    .where(
      and(
        eq(biomechanicsAnnotations.assessmentId, assessment.id),
        eq(biomechanicsAnnotations.organizationId, user.organizationId),
      ),
    )
    .orderBy(asc(biomechanicsAnnotations.timeMs), asc(biomechanicsAnnotations.createdAt));
  const analysisDataForHash = { ...currentAnalysisData };
  delete analysisDataForHash._pdf;
  const hashInput = stableStringify({
    id: assessment.id,
    type: assessment.type,
    analysisData: analysisDataForHash,
    observations: assessment.observations,
    conclusions: assessment.conclusions,
    comparison,
    annotations,
  });
  const reportHash = await sha256Hex(hashInput);

  if (!body.force && previousPdf.hash === reportHash && typeof previousPdf.url === "string") {
    return c.json({
      data: {
        pdfUrl: previousPdf.url,
        pdfKey: previousPdf.key,
        pdfHash: reportHash,
        generated: false,
        cached: true,
        generatedAt: previousPdf.generatedAt,
      },
    });
  }

  const patientName = body.patientName?.trim() || `Paciente ${assessment.patientId.slice(0, 8)}`;
  const html = buildBiomechanicsReportHtml({ assessment, patientName, comparison, reportHash, annotations });
  const pdfBytes = await generatePdfBrowserRun(c.env, html);
  const pdfKey = `documents/biomechanics/${user.organizationId}/${assessment.patientId}/${assessment.id}-${reportHash.slice(
    0,
    12,
  )}.pdf`;
  if (!c.env.R2_PUBLIC_URL) {
    return c.json({ error: "R2_PUBLIC_URL não configurado para publicar PDF biomecânico" }, 500);
  }

  await c.env.MEDIA_BUCKET.put(pdfKey, pdfBytes, {
    httpMetadata: {
      contentType: "application/pdf",
      contentDisposition: `attachment; filename="laudo-biomecanico-${assessment.id.slice(0, 8)}.pdf"`,
    },
    customMetadata: {
      organizationId: user.organizationId,
      patientId: assessment.patientId,
      assessmentId: assessment.id,
      reportHash,
      sourceFeature: "biomechanics",
    },
  });

  const pdfUrl = r2PublicUrl(c.env, pdfKey);
  const generatedAt = new Date().toISOString();
  const analysisData = {
    ...currentAnalysisData,
    _pdf: {
      url: pdfUrl,
      key: pdfKey,
      hash: reportHash,
      generatedAt,
    },
  };

  await db
    .update(biomechanicsAssessments)
    .set({ analysisData: analysisData as any, updatedAt: new Date() })
    .where(
      and(
        eq(biomechanicsAssessments.id, id),
        eq(biomechanicsAssessments.organizationId, user.organizationId),
      ),
    );

  return c.json({
    data: {
      pdfUrl,
      pdfKey,
      pdfHash: reportHash,
      generated: true,
      cached: false,
      generatedAt,
    },
  });
});

// POST /api/biomechanics/:id/sign — Lock and sign the assessment
app.post("/:id/sign", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = await createDb(c.env);

  // Check if already signed
  const [assessment] = await db
    .select()
    .from(biomechanicsAssessments)
    .where(
      and(
        eq(biomechanicsAssessments.id, id),
        eq(biomechanicsAssessments.organizationId, user.organizationId),
      ),
    );

  if (!assessment) return c.json({ error: "Avaliação não encontrada" }, 404);
  if (assessment.status === "signed") return c.json({ error: "Avaliação já está assinada" }, 409);

  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  const now = new Date().toISOString();
  const contentHash = await crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(JSON.stringify(assessment.analysisData)))
    .then((b) =>
      Array.from(new Uint8Array(b))
        .map((x) => x.toString(16).padStart(2, "0"))
        .join(""),
    );

  // Create Signature Metadata (Simulating ICP-Brasil)
  const signatureMetadata = {
    signerId: user.uid,
    signerName: user.email || "Therapist",
    timestamp: now,
    ip,
    userAgent: c.req.header("User-Agent") || "unknown",
    contentHash,
  };

  const [updated] = await db
    .update(biomechanicsAssessments)
    .set({
      status: "signed",
      signedAt: new Date(now),
      reportHash: contentHash,
      signatureMetadata,
      analysisData: {
        ...(assessment.analysisData as object),
        _signature: signatureMetadata,
      } as any,
      updatedAt: new Date(),
    })
    .where(and(eq(biomechanicsAssessments.id, id), eq(biomechanicsAssessments.organizationId, user.organizationId)))
    .returning();

  return c.json({ success: true, data: updated });
});

// GET /api/biomechanics/:id/verify — Verify the integrity of a signed report
app.get("/:id/verify", async (c) => {
  const id = c.req.param("id");
  const db = await createDb(c.env);

  const [assessment] = await db
    .select()
    .from(biomechanicsAssessments)
    .where(eq(biomechanicsAssessments.id, id));

  if (!assessment) return c.json({ error: "Relatório não encontrado" }, 404);
  if (assessment.status !== "signed")
    return c.json({ valid: false, error: "Relatório não está assinado" });

  const analysisData = assessment.analysisData as any;
  const signature = analysisData?._signature;

  if (!signature) return c.json({ valid: false, error: "Metadados de assinatura ausentes" });

  // Re-calculate hash to verify integrity
  const dataToHash = { ...analysisData };
  delete dataToHash._signature;

  const currentHash = await crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(JSON.stringify(dataToHash)))
    .then((b) =>
      Array.from(new Uint8Array(b))
        .map((x) => x.toString(16).padStart(2, "0"))
        .join(""),
    );

  const isValid = currentHash === signature.contentHash;

  return c.json({
    valid: isValid,
    signer: signature.signerName,
    signedAt: signature.timestamp,
    integrityStatus: isValid ? "verified" : "compromised",
  });
});

export { app as biomechanicsRoutes };
