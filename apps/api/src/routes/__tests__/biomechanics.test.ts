import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testes dos portões clínicos de `/api/biomechanics`.
 *
 * A rota não tinha teste nenhum e era por onde métrica sintética chegava a
 * laudo assinado. O foco aqui é exatamente esse caminho: quem pode gerar PDF,
 * quem pode validar, quem pode assinar, e o que acontece com bundle ausente.
 */

const mockUserId = "user-001";
const mockOrgId = "org-test-001";

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", {
      uid: mockUserId,
      organizationId: mockOrgId,
      role: "fisioterapeuta",
      email: "fisio@fisioflow.com",
    });
    await next();
  }),
}));

// Fila de resultados que o mock do Drizzle devolve, em ordem de consulta.
let selectQueue: any[][] = [];
let inserted: any[] = [];
let updated: any[] = [];

function chainableSelect() {
  const result = selectQueue.shift() ?? [];
  const chain: any = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve(result),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

vi.mock("../../lib/db", () => ({
  createDb: vi.fn(async () => ({
    select: () => chainableSelect(),
    insert: () => ({
      values: (v: any) => {
        inserted.push(v);
        return { returning: () => Promise.resolve([{ id: "new-row", ...v }]) };
      },
    }),
    update: () => ({
      set: (v: any) => {
        updated.push(v);
        const chain: any = {
          where: () => chain,
          returning: () => Promise.resolve([{ id: "updated-row", ...v }]),
          then: (resolve: any, reject: any) =>
            Promise.resolve([{ id: "updated-row", ...v }]).then(resolve, reject),
        };
        return chain;
      },
    }),
  })),
}));

vi.mock("../../lib/storage/R2Service", () => ({
  R2Service: class {
    async getUploadUrl(key: string) {
      return `https://r2.example/${key}?signed=1`;
    }
    async getDownloadUrl(key: string) {
      return `https://r2.example/${key}?download=1`;
    }
  },
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { biomechanicsRoutes } = await import("../biomechanics");
  const app = new Hono<any>();
  app.route("/api/biomechanics", biomechanicsRoutes);
  return app;
}

function req(method: string, path: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer fake" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const headMock = vi.fn();
const sendMock = vi.fn();

const ENV = () => ({
  HYPERDRIVE: {},
  ALLOWED_ORIGINS: "*",
  ENVIRONMENT: "development",
  R2_PUBLIC_URL: "https://media.example",
  MEDIA_BUCKET: { head: headMock },
  BACKGROUND_QUEUE: { send: sendMock },
});

const ASSESSMENT = {
  id: "assess-001",
  patientId: "patient-001",
  organizationId: mockOrgId,
  status: "needs_review",
  primaryMediaId: "media-001",
  analysisData: { metrics: { knee_rom: 118 } },
  signedAt: null,
  supersededByAssessmentId: null,
};

const MEDIA_SEM_LANDMARKS = {
  id: "media-001",
  assessmentId: "assess-001",
  organizationId: mockOrgId,
  landmarksR2Key: null,
  attempt: 1,
  view: "sagittal",
  fps: "30",
};

const MEDIA_COM_LANDMARKS = { ...MEDIA_SEM_LANDMARKS, landmarksR2Key: "orgs/x/y.ndjson.gz" };

const METRICA_CLINICA = {
  id: "m1",
  metricKey: "knee_rom",
  provenance: "device_pose",
  acknowledgedAt: new Date(),
  supersededAt: null,
  side: "left",
};

const METRICA_SINTETICA = {
  id: "m2",
  metricKey: "cadence",
  provenance: "synthetic_demo",
  acknowledgedAt: null,
  supersededAt: null,
  side: "bilateral",
};

beforeEach(() => {
  selectQueue = [];
  inserted = [];
  updated = [];
  headMock.mockReset();
  sendMock.mockReset();
});

// ── POST /:id/pdf — o buraco original ───────────────────────────────────────

describe("POST /:id/pdf — portão do laudo", () => {
  it("409 quando a avaliação ainda está em needs_review", async () => {
    selectQueue = [[ASSESSMENT]];
    const app = await buildApp();
    const res = await app.fetch(req("POST", "/api/biomechanics/assess-001/pdf", {}), ENV());

    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("not_validated");
  });

  it("422 quando há métrica com procedência sintética", async () => {
    selectQueue = [
      [{ ...ASSESSMENT, status: "validated" }],
      [METRICA_CLINICA, METRICA_SINTETICA],
    ];
    const app = await buildApp();
    const res = await app.fetch(req("POST", "/api/biomechanics/assess-001/pdf", {}), ENV());

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe("unvalidated_metrics");
    expect(json.details.map((d: any) => d.metricKey)).toContain("cadence");
  });

  it("422 quando a métrica é clínica mas não foi conferida pelo profissional", async () => {
    selectQueue = [
      [{ ...ASSESSMENT, status: "validated" }],
      [{ ...METRICA_CLINICA, acknowledgedAt: null }],
    ];
    const app = await buildApp();
    const res = await app.fetch(req("POST", "/api/biomechanics/assess-001/pdf", {}), ENV());

    expect(res.status).toBe(422);
    expect((await res.json()).details[0].acknowledged).toBe(false);
  });

  it("404 para avaliação de outra organização", async () => {
    selectQueue = [[]];
    const app = await buildApp();
    const res = await app.fetch(req("POST", "/api/biomechanics/alheia/pdf", {}), ENV());
    expect(res.status).toBe(404);
  });
});

// ── POST /:id/process ───────────────────────────────────────────────────────

describe("POST /:id/process — sem insumo não há processamento", () => {
  it("409 no_landmarks_available quando a mídia não tem bundle", async () => {
    selectQueue = [[ASSESSMENT], [], [MEDIA_SEM_LANDMARKS]];
    const app = await buildApp();
    const res = await app.fetch(req("POST", "/api/biomechanics/assess-001/process", {}), ENV());

    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("no_landmarks_available");
    expect(inserted).toHaveLength(0);
  });

  it("devolve o job em andamento em vez de enfileirar outro", async () => {
    const emAndamento = { id: "job-1", status: "running" };
    selectQueue = [[ASSESSMENT], [emAndamento]];
    const app = await buildApp();
    const res = await app.fetch(req("POST", "/api/biomechanics/assess-001/process", {}), ENV());

    expect(res.status).toBe(200);
    expect((await res.json()).data.job.id).toBe("job-1");
    expect(inserted).toHaveLength(0);
  });
});

// ── Ingestão de landmarks ───────────────────────────────────────────────────

describe("POST /:id/landmarks/upload-url", () => {
  it("a chave é derivada no servidor e ignora o que vier do body", async () => {
    selectQueue = [[ASSESSMENT], [MEDIA_SEM_LANDMARKS]];
    const app = await buildApp();
    const res = await app.fetch(
      req("POST", "/api/biomechanics/assess-001/landmarks/upload-url", {
        mediaId: "media-001",
        frameCount: 300,
        attempt: 3,
        key: "orgs/clinica-alheia/roubado.gz",
        organizationId: "org-invasora",
      }),
      ENV(),
    );

    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.key.startsWith(`orgs/${mockOrgId}/`)).toBe(true);
    expect(data.key).not.toContain("clinica-alheia");
    expect(data.key).not.toContain("org-invasora");
  });

  it("400 quando a captura é longa demais", async () => {
    selectQueue = [[ASSESSMENT], [MEDIA_SEM_LANDMARKS]];
    const app = await buildApp();
    const res = await app.fetch(
      req("POST", "/api/biomechanics/assess-001/landmarks/upload-url", { frameCount: 99999 }),
      ENV(),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("too_many_frames");
  });

  it("400 sem frameCount", async () => {
    selectQueue = [[ASSESSMENT], [MEDIA_SEM_LANDMARKS]];
    const app = await buildApp();
    const res = await app.fetch(
      req("POST", "/api/biomechanics/assess-001/landmarks/upload-url", {}),
      ENV(),
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /:id/landmarks/complete", () => {
  const digest = "a".repeat(64);

  it("409 quando o objeto não está no R2", async () => {
    selectQueue = [[ASSESSMENT], [MEDIA_SEM_LANDMARKS]];
    headMock.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.fetch(
      req("POST", "/api/biomechanics/assess-001/landmarks/complete", { sha256: digest }),
      ENV(),
    );

    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("landmarks_object_missing");
  });

  it("409 quando o tamanho no R2 diverge do declarado", async () => {
    selectQueue = [[ASSESSMENT], [MEDIA_SEM_LANDMARKS]];
    headMock.mockResolvedValue({ size: 100 });
    const app = await buildApp();
    const res = await app.fetch(
      req("POST", "/api/biomechanics/assess-001/landmarks/complete", {
        sha256: digest,
        bytes: 50_000,
      }),
      ENV(),
    );

    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("landmarks_size_mismatch");
  });

  it("400 com sha256 malformado", async () => {
    selectQueue = [[ASSESSMENT], [MEDIA_SEM_LANDMARKS]];
    const app = await buildApp();
    const res = await app.fetch(
      req("POST", "/api/biomechanics/assess-001/landmarks/complete", { sha256: "curto" }),
      ENV(),
    );
    expect(res.status).toBe(400);
  });

  it("enfileira o job e grava a procedência do motor de pose", async () => {
    selectQueue = [[ASSESSMENT], [MEDIA_SEM_LANDMARKS], []];
    headMock.mockResolvedValue({ size: 51_200 });
    const app = await buildApp();
    const res = await app.fetch(
      req("POST", "/api/biomechanics/assess-001/landmarks/complete", {
        sha256: digest,
        bytes: 51_200,
        header: {
          schema: "ff-pose-33-v1",
          frameCount: 300,
          fps: 30,
          view: "sagittal",
          attempt: 2,
          poseEngine: { name: "mlkit-pose", version: "1.2.2", platform: "ios" },
          coordinateSpace: { mirrored: true, rotationDegrees: 0 },
        },
      }),
      ENV(),
    );

    expect(res.status).toBe(201);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].type).toBe("PROCESS_BIOMECHANICS_MEDIA");
    expect(sendMock.mock.calls[0][0].payload.phase).toBe("device");

    const mediaUpdate = updated.find((u) => "landmarksSha256" in u);
    expect(mediaUpdate.landmarksSha256).toBe(digest);
    expect(mediaUpdate.poseEngine).toBe("mlkit-pose@1.2.2/ios");
    // sem coordinateSpace o laudo inverteria Esq/Dir na câmera frontal
    expect(mediaUpdate.coordinateSpace).toEqual({ mirrored: true, rotationDegrees: 0 });

    const job = inserted.find((i) => i.inputDigest);
    expect(job.inputDigest).toBe(digest);
    expect(job.phase).toBe("device");
  });

  it("replay com o mesmo digest devolve o MESMO job, sem enfileirar de novo", async () => {
    const jobExistente = { id: "job-existente", status: "queued" };
    selectQueue = [[ASSESSMENT], [MEDIA_SEM_LANDMARKS], [jobExistente]];
    headMock.mockResolvedValue({ size: 51_200 });
    const app = await buildApp();
    const res = await app.fetch(
      req("POST", "/api/biomechanics/assess-001/landmarks/complete", {
        sha256: digest,
        header: { schema: "ff-pose-33-v1", frameCount: 300 },
      }),
      ENV(),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.replayed).toBe(true);
    expect(json.data.job.id).toBe("job-existente");
    expect(sendMock).not.toHaveBeenCalled();
  });
});

// ── Conferência e validação ─────────────────────────────────────────────────

describe("POST /:id/metrics/:metricId/acknowledge — conferir não é editar", () => {
  it("marca a conferência SEM tocar na procedência", async () => {
    selectQueue = [[{ ...ASSESSMENT, status: "needs_review" }], [METRICA_CLINICA]];
    const app = await buildApp();
    const res = await app.fetch(
      req("POST", "/api/biomechanics/assess-001/metrics/m1/acknowledge"),
      ENV(),
    );

    expect(res.status).toBe(200);
    const set = updated[0];
    expect(set.acknowledgedBy).toBe(mockUserId);
    expect(set.acknowledgedAt).toBeInstanceOf(Date);
    expect(set).not.toHaveProperty("provenance");
    expect(set).not.toHaveProperty("source");
  });

  it("422 ao tentar conferir métrica sintética", async () => {
    selectQueue = [[ASSESSMENT], [METRICA_SINTETICA]];
    const app = await buildApp();
    const res = await app.fetch(
      req("POST", "/api/biomechanics/assess-001/metrics/m2/acknowledge"),
      ENV(),
    );

    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe("non_clinical_provenance");
  });

  it("409 em avaliação já assinada", async () => {
    selectQueue = [[{ ...ASSESSMENT, signedAt: new Date() }]];
    const app = await buildApp();
    const res = await app.fetch(
      req("POST", "/api/biomechanics/assess-001/metrics/m1/acknowledge"),
      ENV(),
    );
    expect(res.status).toBe(409);
  });
});

describe("POST /:id/validate", () => {
  it("422 enquanto houver métrica não conferida", async () => {
    selectQueue = [[ASSESSMENT], [{ ...METRICA_CLINICA, acknowledgedAt: null }]];
    const app = await buildApp();
    const res = await app.fetch(req("POST", "/api/biomechanics/assess-001/validate", {}), ENV());

    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe("unacknowledged_metrics");
  });

  it("422 quando não há métrica nenhuma", async () => {
    selectQueue = [[ASSESSMENT], []];
    const app = await buildApp();
    const res = await app.fetch(req("POST", "/api/biomechanics/assess-001/validate", {}), ENV());

    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe("no_metrics");
  });

  it("409 em laudo já assinado", async () => {
    selectQueue = [[{ ...ASSESSMENT, signedAt: new Date() }]];
    const app = await buildApp();
    const res = await app.fetch(req("POST", "/api/biomechanics/assess-001/validate", {}), ENV());
    expect(res.status).toBe(409);
  });

  it("valida quando todas as métricas estão conferidas", async () => {
    selectQueue = [[ASSESSMENT], [METRICA_CLINICA]];
    const app = await buildApp();
    const res = await app.fetch(req("POST", "/api/biomechanics/assess-001/validate", {}), ENV());

    expect(res.status).toBe(200);
    expect(updated[0].status).toBe("validated");
    expect(inserted.some((i) => i.action === "validate")).toBe(true);
  });
});

describe("POST /:id/sign", () => {
  it("409 quando ainda não foi validado", async () => {
    selectQueue = [[{ ...ASSESSMENT, status: "needs_review" }]];
    const app = await buildApp();
    const res = await app.fetch(req("POST", "/api/biomechanics/assess-001/sign", {}), ENV());

    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("not_validated");
  });

  it("409 quando já está assinado", async () => {
    selectQueue = [[{ ...ASSESSMENT, status: "signed" }]];
    const app = await buildApp();
    const res = await app.fetch(req("POST", "/api/biomechanics/assess-001/sign", {}), ENV());
    expect(res.status).toBe(409);
  });

  it("422 com métrica sintética viva", async () => {
    selectQueue = [[{ ...ASSESSMENT, status: "validated" }], [METRICA_SINTETICA]];
    const app = await buildApp();
    const res = await app.fetch(req("POST", "/api/biomechanics/assess-001/sign", {}), ENV());

    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe("unvalidated_metrics");
  });
});
