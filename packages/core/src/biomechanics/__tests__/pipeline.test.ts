import { describe, it, expect } from "vitest";
import { computeAssessmentMetrics, MAX_KEYFRAMES } from "../pipeline";
import { emptyLandmarks } from "../landmarks";
import { LANDMARK_INDEX, type BundleHeader, type CaptureView, type LandmarkFrame } from "../types";

const FPS = 30;

function header(view: CaptureView, frameCount: number): BundleHeader {
  return {
    schema: "ff-pose-33-v1",
    landmarkCount: 33,
    order: "blazepose33",
    fps: FPS,
    frameCount,
    durationMs: Math.round((frameCount * 1000) / FPS),
    view,
    attempt: 3,
    attemptsTotal: 5,
    capturedAt: "2026-08-05T14:03:11.220Z",
    coordinateSpace: {
      origin: "top-left",
      normalized: true,
      mirrored: false,
      rotationDegrees: 0,
      sourceWidth: 1920,
      sourceHeight: 1080,
    },
    poseEngine: { name: "mlkit-pose", version: "1.2.2", platform: "ios" },
  };
}

/**
 * Agachamento sintético: o joelho flete e estende, produzindo ROM conhecida.
 * O lado direito tem amplitude menor de propósito, para a simetria não dar 100.
 */
function agachamento(frameCount = 60, score = 1): LandmarkFrame[] {
  return Array.from({ length: frameCount }, (_, i) => {
    const phase = (2 * Math.PI * i) / frameCount;
    const flexEsq = 0.5 - 0.25 * Math.sin(phase); // desloca o joelho à frente
    const flexDir = 0.5 - 0.15 * Math.sin(phase);

    const landmarks = emptyLandmarks();
    const put = (idx: number, x: number, y: number) => {
      landmarks[idx] = { x, y, z: 0, score };
    };

    put(LANDMARK_INDEX.left_shoulder, 0.45, 0.25);
    put(LANDMARK_INDEX.right_shoulder, 0.55, 0.25);
    put(LANDMARK_INDEX.left_hip, 0.45, 0.5);
    put(LANDMARK_INDEX.right_hip, 0.55, 0.5);
    put(LANDMARK_INDEX.left_knee, flexEsq, 0.7);
    put(LANDMARK_INDEX.right_knee, 1 - flexDir, 0.7);
    put(LANDMARK_INDEX.left_ankle, 0.45, 0.9);
    put(LANDMARK_INDEX.right_ankle, 0.55, 0.9);
    put(LANDMARK_INDEX.left_foot_index, 0.47, 0.95);
    put(LANDMARK_INDEX.right_foot_index, 0.57, 0.95);

    return {
      frameIndex: i,
      timeMs: Math.round((i * 1000) / FPS),
      landmarks,
      confidence: score,
    };
  });
}

const SAGITAL = { slug: "functional-squat-stepdown", metricDefinitions: [{ key: "knee_rom" }] };

describe("consciência de plano — o coração da segurança clínica", () => {
  it("REJEITA FPPA numa captura sagital em vez de estimar", () => {
    const frames = agachamento();
    const result = computeAssessmentMetrics({
      header: header("sagittal", frames.length),
      frames,
      protocol: { metricDefinitions: [{ key: "fppa" }] },
      provenance: "device_pose",
      algorithmVersion: "test",
    });

    expect(result.metrics).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason).toBe("plane_mismatch");
    expect(result.rejected[0].detail).toContain("sagittal");
  });

  it("REJEITA flexão sagital de joelho numa captura frontal", () => {
    const frames = agachamento();
    const result = computeAssessmentMetrics({
      header: header("frontal", frames.length),
      frames,
      protocol: { metricDefinitions: [{ key: "knee_rom" }] },
      provenance: "device_pose",
      algorithmVersion: "test",
    });

    expect(result.metrics).toHaveLength(0);
    expect(result.rejected[0].reason).toBe("plane_mismatch");
  });

  it("aceita FPPA numa captura frontal", () => {
    const frames = agachamento();
    const result = computeAssessmentMetrics({
      header: header("frontal", frames.length),
      frames,
      protocol: { metricDefinitions: [{ key: "fppa" }] },
      provenance: "device_pose",
      algorithmVersion: "test",
    });

    expect(result.metrics.length).toBeGreaterThan(0);
    expect(result.rejected).toHaveLength(0);
  });

  it("rejeita com motivo explícito métrica que ainda não sabemos calcular", () => {
    const frames = agachamento();
    const result = computeAssessmentMetrics({
      header: header("sagittal", frames.length),
      frames,
      protocol: { metricDefinitions: [{ key: "jump_height" }] },
      provenance: "device_pose",
      algorithmVersion: "test",
    });

    expect(result.metrics).toHaveLength(0);
    expect(result.rejected[0].detail).toContain("medição manual");
  });

  it("métrica desconhecida não vira métrica silenciosa", () => {
    const frames = agachamento();
    const result = computeAssessmentMetrics({
      header: header("sagittal", frames.length),
      frames,
      protocol: { metricDefinitions: [{ key: "inventada_do_nada" }] },
      provenance: "device_pose",
      algorithmVersion: "test",
    });

    expect(result.metrics).toHaveLength(0);
    expect(result.rejected[0].metricKey).toBe("inventada_do_nada");
  });
});

describe("qualidade insuficiente não vira número", () => {
  it("frames com score zero produzem ZERO métricas e rejeições preenchidas", () => {
    const frames = agachamento(60, 0);
    const result = computeAssessmentMetrics({
      header: header("sagittal", frames.length),
      frames,
      protocol: SAGITAL,
      provenance: "device_pose",
      algorithmVersion: "test",
    });

    expect(result.metrics).toEqual([]);
    expect(result.rejected.length).toBeGreaterThan(0);
    expect(result.quality.verdict).toBe("unusable");
    // o ponto: nenhum valor 0 foi emitido como se fosse medida
    expect(result.metrics.every((m) => m.metricValue !== 0)).toBe(true);
  });

  it("captura vazia não explode e não inventa", () => {
    const result = computeAssessmentMetrics({
      header: header("sagittal", 0),
      frames: [],
      protocol: SAGITAL,
      provenance: "device_pose",
      algorithmVersion: "test",
    });

    expect(result.metrics).toEqual([]);
    expect(result.keyframes).toEqual([]);
    expect(result.quality.score).toBe(0);
  });

  it("score abaixo do mínimo derruba a captura inteira", () => {
    const frames = agachamento(60, 0.3);
    const result = computeAssessmentMetrics({
      header: header("sagittal", frames.length),
      frames,
      protocol: SAGITAL,
      provenance: "device_pose",
      algorithmVersion: "test",
    });

    expect(result.metrics).toEqual([]);
    expect(result.rejected[0].reason).toBe("low_confidence");
  });
});

describe("métricas produzidas", () => {
  const frames = agachamento();
  const result = computeAssessmentMetrics({
    header: header("sagittal", frames.length),
    frames,
    protocol: { metricDefinitions: [{ key: "knee_rom" }, { key: "symmetry" }] },
    provenance: "device_pose",
    algorithmVersion: "test",
  });

  it("emite ROM para os dois lados", () => {
    const rom = result.metrics.filter((m) => m.metricKey === "knee_rom");
    expect(rom).toHaveLength(2);
    expect(rom.map((m) => m.side).sort()).toEqual(["left", "right"]);
  });

  it("toda métrica carrega procedência, sampleCount e plano", () => {
    expect(result.metrics.length).toBeGreaterThan(0);
    for (const m of result.metrics) {
      expect(m.provenance).toBe("device_pose");
      expect(m.sampleCount).toBeGreaterThan(0);
      expect(m.view).toBe("sagittal");
      expect(Number.isFinite(m.metricValue)).toBe(true);
      expect(Number.isNaN(m.metricValue)).toBe(false);
    }
  });

  it("NUNCA emite provenance sintética", () => {
    expect(result.metrics.some((m) => m.provenance === "synthetic_demo")).toBe(false);
  });

  it("simetria reflete a assimetria construída na fixture (não dá 100)", () => {
    const sim = result.metrics.find((m) => m.metricKey === "symmetry");
    expect(sim).toBeDefined();
    expect(sim!.metricValue).toBeLessThan(100);
    expect(sim!.metricValue).toBeGreaterThan(0);
  });

  it("marca o evento de pico articular", () => {
    expect(result.events.some((e) => e.eventType.startsWith("peak_knee"))).toBe(true);
  });

  it("é determinística: mesma entrada, mesma saída", () => {
    const outra = computeAssessmentMetrics({
      header: header("sagittal", frames.length),
      frames,
      protocol: { metricDefinitions: [{ key: "knee_rom" }, { key: "symmetry" }] },
      provenance: "device_pose",
      algorithmVersion: "test",
    });
    expect(outra.metrics).toEqual(result.metrics);
  });
});

describe("keyframes", () => {
  it("nunca passa de 120 — GET /workbench trunca em 120 e o gráfico sairia errado", () => {
    const frames = agachamento(900); // 30 s
    const result = computeAssessmentMetrics({
      header: header("sagittal", frames.length),
      frames,
      protocol: SAGITAL,
      provenance: "device_pose",
      algorithmVersion: "test",
    });

    expect(result.keyframes.length).toBeLessThanOrEqual(MAX_KEYFRAMES);
    expect(result.keyframes.length).toBeGreaterThan(50);
  });

  it("preserva o número da tentativa e o plano em cada keyframe", () => {
    const frames = agachamento();
    const result = computeAssessmentMetrics({
      header: header("sagittal", frames.length),
      frames,
      protocol: SAGITAL,
      provenance: "device_pose",
      algorithmVersion: "test",
    });

    expect(result.keyframes.every((k) => k.attempt === 3)).toBe(true);
    expect(result.keyframes.every((k) => k.view === "sagittal")).toBe(true);
  });

  it("captura curta não é decimada", () => {
    const frames = agachamento(40);
    const result = computeAssessmentMetrics({
      header: header("sagittal", frames.length),
      frames,
      protocol: SAGITAL,
      provenance: "device_pose",
      algorithmVersion: "test",
    });
    expect(result.keyframes).toHaveLength(40);
  });
});

describe("procedência do container produz o mesmo cálculo", () => {
  it("só o rótulo muda entre device_pose e container_pose", () => {
    const frames = agachamento();
    const comum = {
      header: header("sagittal", frames.length),
      frames,
      protocol: SAGITAL,
      algorithmVersion: "test",
    };
    const device = computeAssessmentMetrics({ ...comum, provenance: "device_pose" });
    const container = computeAssessmentMetrics({ ...comum, provenance: "container_pose" });

    expect(device.metrics.map((m) => m.metricValue)).toEqual(
      container.metrics.map((m) => m.metricValue),
    );
    expect(container.metrics.every((m) => m.provenance === "container_pose")).toBe(true);
  });
});
