/**
 * A função por onde todo número biomecânico passa.
 *
 * Substitui `deterministicBiomechanicsMetrics()` do Worker, que inventava as
 * métricas. Determinística e sem I/O de propósito: o Worker chama para gravar
 * no laudo e o app chama para desenhar no vídeo, e o resultado é o mesmo.
 *
 * A regra central é a consciência de plano. FPPA e queda pélvica só existem no
 * plano frontal; flexão sagital de joelho/quadril/tornozelo só no sagital.
 * Pedir FPPA de uma captura sagital não devolve um valor pior — não devolve
 * valor nenhum, e a rejeição aparece na tela como "não mensurável neste
 * plano". Um número plausível é pior que um campo vazio, porque ninguém
 * questiona o que parece certo.
 */

import {
  cadenceSpm,
  dynamicValgusFPPA,
  jointAngleSeries,
  MIN_LANDMARK_SCORE,
  pelvicDrop,
  romFromSeries,
  smoothSeries,
  stepTimeAsymmetry,
  symmetryIndex,
  trunkInclination,
  type Joint,
} from "./kinematics";
import { mean, round2 } from "./math";
import { assessCaptureQuality, MIN_USABLE_FRAME_RATIO } from "./quality";
import type {
  BundleHeader,
  CaptureView,
  ComputedMetric,
  DetectedEvent,
  KeyframeRecord,
  LandmarkFrame,
  MetricProvenance,
  QualityReport,
  RejectionReason,
  Side,
} from "./types";

/** `GET /:id/workbench` já faz .limit(120); passar disso seria truncado em silêncio. */
export const MAX_KEYFRAMES = 120;

export interface ProtocolDefinition {
  slug?: string;
  metricDefinitions?: Array<{ key: string; unit?: string }>;
}

export interface PipelineInput {
  header: BundleHeader;
  frames: LandmarkFrame[];
  protocol: ProtocolDefinition | null;
  provenance: Extract<MetricProvenance, "device_pose" | "container_pose">;
  algorithmVersion: string;
}

export interface PipelineResult {
  metrics: ComputedMetric[];
  events: DetectedEvent[];
  keyframes: KeyframeRecord[];
  quality: QualityReport;
  rejected: RejectionReason[];
}

/** Em que plano cada métrica é mensurável, e se ainda não sabemos calculá-la. */
const METRIC_PLANE: Record<string, { views: CaptureView[]; supported: boolean }> = {
  knee_rom: { views: ["sagittal"], supported: true },
  knee_flexion: { views: ["sagittal"], supported: true },
  hip_flexion: { views: ["sagittal"], supported: true },
  ankle_dorsiflexion: { views: ["sagittal"], supported: true },
  trunk_inclination: { views: ["sagittal", "frontal", "posterior"], supported: true },
  // FPPA — ângulo de projeção no plano frontal.
  // NÃO é "valgo de joelho": Lopes 2018 (meta-análise) achou r=0,127 (p=0,094)
  // contra o ângulo frontal 3D no agachamento unipodal. É marcador de padrão
  // de movimento, majoritariamente adução de quadril + rotação externa de tíbia.
  fppa: { views: ["frontal", "posterior"], supported: true },
  pelvic_drop: { views: ["frontal", "posterior"], supported: true },
  symmetry: { views: ["sagittal", "frontal", "posterior"], supported: true },
  step_symmetry: { views: ["sagittal", "frontal", "posterior"], supported: true },
  cadence: { views: ["sagittal", "frontal", "posterior"], supported: true },

  // Reconhecidas mas ainda não calculáveis a partir de pose 2D. Precisam de
  // detecção de contato/voo confiável (contact_time, stance_time, flight_time,
  // jump_height, lsi) ou de referencial calibrado (as de postura estática).
  // Ficam aqui para serem REJEITADAS com motivo explícito em vez de sumirem
  // sem explicação do laudo.
  contact_time: { views: ["sagittal"], supported: false },
  stance_time: { views: ["sagittal"], supported: false },
  flight_time: { views: ["sagittal", "frontal"], supported: false },
  jump_height: { views: ["sagittal", "frontal"], supported: false },
  lsi: { views: ["frontal"], supported: false },
  head_alignment: { views: ["frontal", "posterior"], supported: false },
  shoulder_asymmetry: { views: ["frontal", "posterior"], supported: false },
  pelvic_tilt: { views: ["sagittal"], supported: false },
  knee_alignment: { views: ["frontal"], supported: false },
};

/** Usado quando o protocolo não declara métricas. */
const DEFAULT_METRIC_KEYS = ["knee_rom", "trunk_inclination", "fppa", "symmetry"];

const SIDES: Side[] = ["left", "right"];

export function computeAssessmentMetrics(input: PipelineInput): PipelineResult {
  const { header, frames, protocol, provenance, algorithmVersion } = input;

  const metrics: ComputedMetric[] = [];
  const rejected: RejectionReason[] = [];
  const events: DetectedEvent[] = [];

  const view = header.view;
  const fps = header.fps > 0 ? header.fps : 30;
  const quality = assessCaptureQuality(frames);

  const requested = (
    protocol?.metricDefinitions?.length
      ? protocol.metricDefinitions.map((d) => d.key)
      : DEFAULT_METRIC_KEYS
  ).filter((key, i, arr) => arr.indexOf(key) === i);

  // Captura ruim demais: rejeita TUDO com o mesmo motivo, em vez de deixar
  // passar as métricas que por acaso tiveram frames bons.
  if (quality.usableFrameRatio < MIN_USABLE_FRAME_RATIO) {
    for (const key of requested) {
      rejected.push({
        metricKey: key,
        reason: "low_confidence",
        detail: `Apenas ${Math.round(quality.usableFrameRatio * 100)}% dos frames são utilizáveis (mínimo ${Math.round(MIN_USABLE_FRAME_RATIO * 100)}%).`,
      });
    }
    return { metrics, events, keyframes: [], quality, rejected };
  }

  const timesMs = frames.map((f) => f.timeMs);

  // Séries suavizadas, calculadas uma vez e reaproveitadas.
  const angleSeries = new Map<string, Array<number | null>>();
  const seriesFor = (joint: Joint, side: Side): Array<number | null> => {
    const cacheKey = `${joint}:${side}`;
    let series = angleSeries.get(cacheKey);
    if (!series) {
      series = smoothSeries(jointAngleSeries(frames, joint, side), fps);
      angleSeries.set(cacheKey, series);
    }
    return series;
  };

  for (const key of requested) {
    const spec = METRIC_PLANE[key];

    if (!spec) {
      rejected.push({
        metricKey: key,
        reason: "plane_mismatch",
        detail: `Métrica "${key}" não é reconhecida pelo pipeline de pose 2D.`,
      });
      continue;
    }

    if (!spec.views.includes(view)) {
      rejected.push({
        metricKey: key,
        reason: "plane_mismatch",
        detail: `"${key}" só é mensurável em ${spec.views.join(" ou ")}; esta captura é ${view}.`,
      });
      continue;
    }

    if (!spec.supported) {
      rejected.push({
        metricKey: key,
        reason: "missing_landmarks",
        detail: `"${key}" ainda não é calculável a partir de pose 2D — requer medição manual.`,
      });
      continue;
    }

    const produced = computeMetric(key, {
      frames,
      timesMs,
      view,
      fps,
      provenance,
      seriesFor,
      quality,
    });

    if (produced.metrics.length === 0) {
      rejected.push(
        ...(produced.rejected.length
          ? produced.rejected
          : [
              {
                metricKey: key,
                reason: "insufficient_frames" as const,
                detail: `Não houve amostras válidas suficientes para "${key}".`,
              },
            ]),
      );
      continue;
    }

    metrics.push(...produced.metrics);
    events.push(...produced.events);
  }

  void algorithmVersion; // gravado pelo chamador em algorithm_version

  return {
    metrics,
    events,
    keyframes: decimateKeyframes(frames, view, header.attempt ?? 1),
    quality,
    rejected,
  };
}

interface MetricContext {
  frames: LandmarkFrame[];
  timesMs: number[];
  view: CaptureView;
  fps: number;
  provenance: Extract<MetricProvenance, "device_pose" | "container_pose">;
  seriesFor: (joint: Joint, side: Side) => Array<number | null>;
  quality: QualityReport;
}

function computeMetric(
  key: string,
  ctx: MetricContext,
): { metrics: ComputedMetric[]; events: DetectedEvent[]; rejected: RejectionReason[] } {
  const metrics: ComputedMetric[] = [];
  const events: DetectedEvent[] = [];
  const rejected: RejectionReason[] = [];

  const base = {
    view: ctx.view,
    provenance: ctx.provenance,
    confidence: round2(ctx.quality.meanConfidence),
  };

  switch (key) {
    case "knee_rom":
    case "knee_flexion":
    case "hip_flexion":
    case "ankle_dorsiflexion": {
      const joint: Joint =
        key === "hip_flexion" ? "hip" : key === "ankle_dorsiflexion" ? "ankle" : "knee";

      for (const side of SIDES) {
        const rom = romFromSeries(ctx.seriesFor(joint, side), ctx.timesMs);
        if (!rom) continue;

        metrics.push({
          ...base,
          metricKey: key,
          metricValue: key === "knee_rom" ? rom.rom : rom.max,
          unit: "deg",
          side,
          sampleCount: rom.sampleCount,
        });

        events.push({
          eventType: `peak_${joint}_${side}`,
          timeMs: rom.peakTimeMs,
          frameIndex: ctx.timesMs.indexOf(rom.peakTimeMs),
          confidence: base.confidence,
          metadata: { value: rom.max },
        });
      }
      break;
    }

    case "trunk_inclination": {
      const values = ctx.frames
        .map((f) => trunkInclination(f))
        .filter((v): v is number => v !== null);

      if (values.length >= 10) {
        metrics.push({
          ...base,
          metricKey: key,
          // Pico de inclinação é o que interessa clinicamente, não a média.
          metricValue: round2(Math.max(...values)),
          unit: "deg",
          side: "bilateral",
          sampleCount: values.length,
        });
      }
      break;
    }

    case "fppa": {
      for (const side of SIDES) {
        const values = ctx.frames
          .map((f) => dynamicValgusFPPA(f, side))
          .filter((v): v is number => v !== null);

        if (values.length < 10) continue;

        // VARIAÇÃO a partir da postura inicial, não valor absoluto.
        //
        // Asaeda 2024 (Heliyon) mediu erro de 18,8–19,7° no valor absoluto do
        // FPPA com MediaPipe contra Vicon — sem validade concorrente. O mesmo
        // estudo mostrou que a variação em relação ao contato inicial TEM
        // confiabilidade e validade. Reportar o absoluto seria publicar um
        // número que a literatura já demonstrou não significar o que parece.
        const referencia = values[0];
        const excursoes = values.map((v) => v - referencia);
        const pico = excursoes.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);

        metrics.push({
          ...base,
          metricKey: key,
          metricValue: round2(pico),
          unit: "deg",
          side,
          sampleCount: values.length,
        });
      }
      break;
    }

    case "pelvic_drop": {
      const values = ctx.frames.map((f) => pelvicDrop(f)).filter((v): v is number => v !== null);

      if (values.length >= 10) {
        const peak = values.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
        metrics.push({
          ...base,
          metricKey: key,
          metricValue: round2(peak),
          unit: "deg",
          side: "bilateral",
          sampleCount: values.length,
        });
      }
      break;
    }

    case "symmetry": {
      const left = romFromSeries(ctx.seriesFor("knee", "left"), ctx.timesMs);
      const right = romFromSeries(ctx.seriesFor("knee", "right"), ctx.timesMs);

      if (!left || !right) {
        rejected.push({
          metricKey: key,
          reason: "insufficient_frames",
          detail: "Simetria exige ROM válida dos dois lados; um deles não foi mensurável.",
        });
        break;
      }

      const index = symmetryIndex(left.rom, right.rom);
      if (index === null) break;

      metrics.push({
        ...base,
        metricKey: key,
        metricValue: index,
        unit: "%",
        side: "bilateral",
        sampleCount: Math.min(left.sampleCount, right.sampleCount),
      });
      break;
    }

    case "cadence":
    case "step_symmetry": {
      const contacts = detectContacts(ctx.frames, ctx.fps);

      if (contacts.length < 3) {
        rejected.push({
          metricKey: key,
          reason: "insufficient_frames",
          detail: `Foram detectados ${contacts.length} contatos iniciais; são necessários ao menos 3.`,
        });
        break;
      }

      const times = contacts.map((c) => c.timeMs);
      const value = key === "cadence" ? cadenceSpm(times) : stepTimeAsymmetry(times);
      if (value === null) break;

      metrics.push({
        ...base,
        metricKey: key,
        metricValue: key === "step_symmetry" ? round2(100 - value) : value,
        unit: key === "cadence" ? "spm" : "%",
        side: "bilateral",
        sampleCount: contacts.length,
      });

      events.push(...contacts);
      break;
    }

    default:
      rejected.push({
        metricKey: key,
        reason: "plane_mismatch",
        detail: `Sem implementação para "${key}".`,
      });
  }

  return { metrics, events, rejected };
}

/**
 * Contato inicial: mínimo local da altura do tornozelo (y máximo, pois y cresce
 * para baixo). Heurística simples e honesta — por isso `cadence` sai com
 * `sampleCount` igual ao número de contatos, para o laudo mostrar em quantos
 * passos a conta se apoia.
 */
function detectContacts(frames: LandmarkFrame[], fps: number): DetectedEvent[] {
  const contacts: DetectedEvent[] = [];
  const minSeparationFrames = Math.max(2, Math.round(fps * 0.25));

  for (const side of SIDES) {
    const ankleIndex = side === "left" ? 27 : 28;
    const heights = frames.map((f) => {
      const lm = f.landmarks[ankleIndex];
      return lm && lm.score >= MIN_LANDMARK_SCORE ? lm.y : null;
    });

    let lastIndex = -minSeparationFrames;
    for (let i = 1; i < heights.length - 1; i++) {
      const prev = heights[i - 1];
      const curr = heights[i];
      const next = heights[i + 1];
      if (prev === null || curr === null || next === null) continue;
      if (curr > prev && curr >= next && i - lastIndex >= minSeparationFrames) {
        contacts.push({
          eventType: "initial_contact",
          timeMs: frames[i].timeMs,
          frameIndex: frames[i].frameIndex,
          confidence: frames[i].confidence,
          metadata: { side },
        });
        lastIndex = i;
      }
    }
  }

  return contacts.sort((a, b) => a.timeMs - b.timeMs);
}

/** Reduz a série a no máximo MAX_KEYFRAMES, preservando as pontas. */
export function decimateKeyframes(
  frames: LandmarkFrame[],
  view: CaptureView,
  attempt: number,
): KeyframeRecord[] {
  if (frames.length === 0) return [];

  const step = Math.max(1, Math.ceil(frames.length / MAX_KEYFRAMES));
  const picked: LandmarkFrame[] = [];

  for (let i = 0; i < frames.length; i += step) picked.push(frames[i]);

  const last = frames[frames.length - 1];
  if (picked[picked.length - 1] !== last && picked.length < MAX_KEYFRAMES) picked.push(last);

  return picked.slice(0, MAX_KEYFRAMES).map((f) => ({
    frameIndex: f.frameIndex,
    timeMs: f.timeMs,
    landmarks: f.landmarks,
    confidence: f.confidence,
    view,
    attempt,
  }));
}

/** Média das confianças, para relatórios. */
export function overallConfidence(metrics: ComputedMetric[]): number {
  return metrics.length === 0 ? 0 : round2(mean(metrics.map((m) => m.confidence)));
}
