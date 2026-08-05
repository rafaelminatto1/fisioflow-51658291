import { describe, it, expect } from "vitest";
import { applyCoordinateSpace, emptyLandmarks, fromMlKitPose } from "../landmarks";
import {
  cadenceSpm,
  dynamicValgusFPPA,
  jointAngleSeries,
  pelvicDrop,
  romFromSeries,
  smoothSeries,
  stepTimeAsymmetry,
  symmetryIndex,
  trunkInclination,
} from "../kinematics";
import { LANDMARK_COUNT, LANDMARK_INDEX, type CoordinateSpace, type LandmarkFrame } from "../types";

function frameFrom(
  points: Record<number, { x: number; y: number; score?: number }>,
  frameIndex = 0,
  timeMs = 0,
): LandmarkFrame {
  const landmarks = emptyLandmarks();
  for (const [idx, p] of Object.entries(points)) {
    landmarks[Number(idx)] = { x: p.x, y: p.y, z: 0, score: p.score ?? 1 };
  }
  return { frameIndex, timeMs, landmarks, confidence: 1 };
}

const CANONICAL: CoordinateSpace = {
  origin: "top-left",
  normalized: true,
  mirrored: false,
  rotationDegrees: 0,
  sourceWidth: 1920,
  sourceHeight: 1080,
};

describe("jointAngleSeries", () => {
  it("perna estendida = 180°", () => {
    const frame = frameFrom({
      [LANDMARK_INDEX.right_hip]: { x: 0.5, y: 0.4 },
      [LANDMARK_INDEX.right_knee]: { x: 0.5, y: 0.6 },
      [LANDMARK_INDEX.right_ankle]: { x: 0.5, y: 0.8 },
    });
    expect(jointAngleSeries([frame], "knee", "right")[0]).toBeCloseTo(180, 4);
  });

  it("frame com ponto de score baixo vira null, não um número ruim", () => {
    const frame = frameFrom({
      [LANDMARK_INDEX.right_hip]: { x: 0.5, y: 0.4 },
      [LANDMARK_INDEX.right_knee]: { x: 0.5, y: 0.6, score: 0.2 },
      [LANDMARK_INDEX.right_ankle]: { x: 0.5, y: 0.8 },
    });
    expect(jointAngleSeries([frame], "knee", "right")[0]).toBeNull();
  });
});

describe("romFromSeries", () => {
  const fps = 30;
  const n = 60; // 2 s
  const times = Array.from({ length: n }, (_, i) => Math.round((i * 1000) / fps));
  // 90 + 30·sin(2πt) -> min 60, max 120, ROM 60
  const series = Array.from(
    { length: n },
    (_, i) => 90 + 30 * Math.sin((2 * Math.PI * i) / fps),
  );

  it("recupera min, max e ROM analíticos", () => {
    const rom = romFromSeries(series, times)!;
    // A 30 fps o pico da senoide cai em i=7,5 — entre dois frames. O extremo
    // amostrado fica ~0,16° aquém do analítico, e isso é da amostragem
    // discreta, não do cálculo. Tolerância de 0,5° cobre isso e ainda é uma
    // ordem de grandeza mais apertada que a repetibilidade de um goniômetro.
    expect(rom.min).toBeCloseTo(60, 0);
    expect(rom.max).toBeCloseTo(120, 0);
    expect(rom.rom).toBeCloseTo(60, 0);
    expect(rom.sampleCount).toBe(n);
  });

  it("marca o pico no instante analítico (t = 0,25 s), ±1 frame", () => {
    const rom = romFromSeries(series, times)!;
    const esperado = 250;
    expect(Math.abs(rom.peakTimeMs - esperado)).toBeLessThanOrEqual(Math.ceil(1000 / fps));
  });

  it("null com amostras insuficientes — ROM de 3 frames é ruído com cara de medida", () => {
    expect(romFromSeries([90, 100, 110], [0, 33, 66])).toBeNull();
  });

  it("ignora buracos sem propagar NaN", () => {
    const comBuracos = series.map((v, i) => (i % 3 === 0 ? null : v));
    const rom = romFromSeries(comBuracos, times)!;
    expect(rom).not.toBeNull();
    expect(Number.isNaN(rom.rom)).toBe(false);
    expect(rom.sampleCount).toBeLessThan(n);
  });
});

describe("symmetryIndex — fórmula fixada", () => {
  it("(1 - |100-80|/100) * 100 = 80", () => {
    expect(symmetryIndex(100, 80)).toBe(80);
  });

  it("iguais = 100", () => {
    expect(symmetryIndex(118, 118)).toBe(100);
  });

  it("é comutativo", () => {
    expect(symmetryIndex(80, 100)).toBe(symmetryIndex(100, 80));
  });

  it("null quando os dois lados são zero, em vez de dividir por zero", () => {
    expect(symmetryIndex(0, 0)).toBeNull();
  });
});

describe("cadência e assimetria de passo", () => {
  it("contatos a cada 500 ms = 120 spm", () => {
    const contatos = [0, 500, 1000, 1500, 2000];
    expect(cadenceSpm(contatos)).toBeCloseTo(120, 4);
  });

  it("passos alternando 480/520 ms ainda dão 120 spm, mas com assimetria > 0", () => {
    // Número PAR de intervalos (480,520,480,520) para a média dar 500 exatos —
    // é o caso que isola a assimetria da cadência.
    const contatos = [0, 480, 1000, 1480, 2000];
    expect(cadenceSpm(contatos)).toBeCloseTo(120, 4);
    // 40 ms de diferença sobre 520 = 7,7%
    expect(stepTimeAsymmetry(contatos)!).toBeCloseTo(7.69, 1);
  });

  it("marcha regular tem assimetria zero", () => {
    expect(stepTimeAsymmetry([0, 500, 1000, 1500, 2000])).toBe(0);
  });

  it("null com menos de 2 contatos", () => {
    expect(cadenceSpm([100])).toBeNull();
  });
});

describe("trunkInclination", () => {
  it("tronco ereto = 0°", () => {
    const frame = frameFrom({
      [LANDMARK_INDEX.left_shoulder]: { x: 0.45, y: 0.3 },
      [LANDMARK_INDEX.right_shoulder]: { x: 0.55, y: 0.3 },
      [LANDMARK_INDEX.left_hip]: { x: 0.45, y: 0.6 },
      [LANDMARK_INDEX.right_hip]: { x: 0.55, y: 0.6 },
    });
    expect(trunkInclination(frame)).toBeCloseTo(0, 4);
  });

  it("inclinação de 45° é detectada", () => {
    const frame = frameFrom({
      [LANDMARK_INDEX.left_shoulder]: { x: 0.75, y: 0.3 },
      [LANDMARK_INDEX.right_shoulder]: { x: 0.85, y: 0.3 },
      [LANDMARK_INDEX.left_hip]: { x: 0.45, y: 0.6 },
      [LANDMARK_INDEX.right_hip]: { x: 0.55, y: 0.6 },
    });
    expect(trunkInclination(frame)).toBeCloseTo(45, 4);
  });
});

describe("pelvicDrop", () => {
  it("pelve nivelada = 0°", () => {
    const frame = frameFrom({
      [LANDMARK_INDEX.left_hip]: { x: 0.45, y: 0.6 },
      [LANDMARK_INDEX.right_hip]: { x: 0.55, y: 0.6 },
    });
    expect(pelvicDrop(frame)).toBeCloseTo(0, 4);
  });

  it("lado direito mais baixo dá valor positivo", () => {
    const frame = frameFrom({
      [LANDMARK_INDEX.left_hip]: { x: 0.45, y: 0.6 },
      [LANDMARK_INDEX.right_hip]: { x: 0.55, y: 0.65 },
    });
    expect(pelvicDrop(frame)!).toBeGreaterThan(0);
  });
});

describe("dynamicValgusFPPA", () => {
  it("alinhamento perfeito = 0°", () => {
    const frame = frameFrom({
      [LANDMARK_INDEX.right_hip]: { x: 0.5, y: 0.4 },
      [LANDMARK_INDEX.right_knee]: { x: 0.5, y: 0.6 },
      [LANDMARK_INDEX.right_ankle]: { x: 0.5, y: 0.8 },
    });
    expect(dynamicValgusFPPA(frame, "right")).toBeCloseTo(0, 4);
  });

  it("desvio do joelho produz magnitude não nula", () => {
    const frame = frameFrom({
      [LANDMARK_INDEX.right_hip]: { x: 0.5, y: 0.4 },
      [LANDMARK_INDEX.right_knee]: { x: 0.55, y: 0.6 },
      [LANDMARK_INDEX.right_ankle]: { x: 0.5, y: 0.8 },
    });
    expect(Math.abs(dynamicValgusFPPA(frame, "right")!)).toBeGreaterThan(1);
  });

  it("desvios opostos trocam o sinal", () => {
    const medial = frameFrom({
      [LANDMARK_INDEX.right_hip]: { x: 0.5, y: 0.4 },
      [LANDMARK_INDEX.right_knee]: { x: 0.55, y: 0.6 },
      [LANDMARK_INDEX.right_ankle]: { x: 0.5, y: 0.8 },
    });
    const lateral = frameFrom({
      [LANDMARK_INDEX.right_hip]: { x: 0.5, y: 0.4 },
      [LANDMARK_INDEX.right_knee]: { x: 0.45, y: 0.6 },
      [LANDMARK_INDEX.right_ankle]: { x: 0.5, y: 0.8 },
    });
    expect(Math.sign(dynamicValgusFPPA(medial, "right")!)).toBe(
      -Math.sign(dynamicValgusFPPA(lateral, "right")!),
    );
  });
});

// ── O teste que impede uma classe inteira de laudo invertido ────────────────

describe("espelhamento da câmera frontal", () => {
  it("mirrored:true troca Esq/Dir e NÃO muda mais nada", () => {
    // Sujeito deliberadamente assimétrico: joelho esquerdo fletido, direito reto.
    const pontos = {
      [LANDMARK_INDEX.left_hip]: { x: 0.45, y: 0.4 },
      [LANDMARK_INDEX.left_knee]: { x: 0.44, y: 0.6 },
      [LANDMARK_INDEX.left_ankle]: { x: 0.52, y: 0.78 },
      [LANDMARK_INDEX.right_hip]: { x: 0.55, y: 0.4 },
      [LANDMARK_INDEX.right_knee]: { x: 0.55, y: 0.6 },
      [LANDMARK_INDEX.right_ankle]: { x: 0.55, y: 0.8 },
    };
    const cru = frameFrom(pontos);

    const direto = applyCoordinateSpace(cru, CANONICAL);
    const espelhado = applyCoordinateSpace(cru, { ...CANONICAL, mirrored: true });

    const esqDireto = jointAngleSeries([direto], "knee", "left")[0]!;
    const dirDireto = jointAngleSeries([direto], "knee", "right")[0]!;
    const esqEspelhado = jointAngleSeries([espelhado], "knee", "left")[0]!;
    const dirEspelhado = jointAngleSeries([espelhado], "knee", "right")[0]!;

    // o sujeito É assimétrico — senão o teste passaria por acidente
    expect(Math.abs(esqDireto - dirDireto)).toBeGreaterThan(5);

    // espelhar troca os lados...
    expect(esqEspelhado).toBeCloseTo(dirDireto, 6);
    expect(dirEspelhado).toBeCloseTo(esqDireto, 6);
  });

  it("aplicar duas vezes volta ao original — por isso só se aplica na ingestão", () => {
    const cru = frameFrom({
      [LANDMARK_INDEX.left_knee]: { x: 0.3, y: 0.5 },
      [LANDMARK_INDEX.right_knee]: { x: 0.7, y: 0.5 },
    });
    const uma = applyCoordinateSpace(cru, { ...CANONICAL, mirrored: true });
    const duas = applyCoordinateSpace(uma, { ...CANONICAL, mirrored: true });

    expect(duas.landmarks[LANDMARK_INDEX.left_knee].x).toBeCloseTo(0.3, 9);
    expect(duas.landmarks[LANDMARK_INDEX.right_knee].x).toBeCloseTo(0.7, 9);
  });

  it("rotação de 180° inverte os dois eixos", () => {
    const cru = frameFrom({ [LANDMARK_INDEX.nose]: { x: 0.25, y: 0.1 } });
    const rot = applyCoordinateSpace(cru, { ...CANONICAL, rotationDegrees: 180 });
    expect(rot.landmarks[LANDMARK_INDEX.nose].x).toBeCloseTo(0.75, 9);
    expect(rot.landmarks[LANDMARK_INDEX.nose].y).toBeCloseTo(0.9, 9);
  });

  it("normaliza pixels para 0–1 quando normalized:false", () => {
    const cru = frameFrom({ [LANDMARK_INDEX.nose]: { x: 960, y: 540 } });
    const norm = applyCoordinateSpace(cru, { ...CANONICAL, normalized: false });
    expect(norm.landmarks[LANDMARK_INDEX.nose].x).toBeCloseTo(0.5, 9);
    expect(norm.landmarks[LANDMARK_INDEX.nose].y).toBeCloseTo(0.5, 9);
  });
});

describe("fromMlKitPose", () => {
  it("ponto ausente vira score 0 em vez de sumir (stride fixo)", () => {
    const frame = fromMlKitPose([{ x: 0.5, y: 0.5, inFrameLikelihood: 0.9 }, null], {
      frameIndex: 0,
      timeMs: 0,
    });
    expect(frame.landmarks).toHaveLength(LANDMARK_COUNT);
    expect(frame.landmarks[1].score).toBe(0);
  });

  it("descarta coordenada não finita em vez de propagar NaN", () => {
    const frame = fromMlKitPose([{ x: NaN, y: 0.5, inFrameLikelihood: 0.9 }], {
      frameIndex: 0,
      timeMs: 0,
    });
    expect(frame.landmarks[0].score).toBe(0);
    expect(Number.isNaN(frame.landmarks[0].x)).toBe(false);
  });
});

describe("smoothSeries", () => {
  it("preserva buracos em vez de interpolar por cima", () => {
    const series = [10, 11, null, 13, 14, 15, 16, 17, 18, 19];
    const out = smoothSeries(series, 30);
    expect(out[2]).toBeNull();
    expect(out).toHaveLength(series.length);
  });
});
