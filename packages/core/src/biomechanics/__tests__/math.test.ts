import { describe, it, expect } from "vitest";
import {
  angle2D,
  angle3D,
  butterworthLowPass,
  mean,
  movingMedian,
  signedAngleToVertical,
  signedDistanceToLine,
  velocity,
  zeroCrossings,
} from "../math";

describe("angle2D — valores analíticos", () => {
  it("segmentos colineares opostos (perna estendida) = 180°", () => {
    // quadril(0,0) — joelho(0,1) — tornozelo(0,2)
    expect(angle2D({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 })).toBeCloseTo(180, 6);
  });

  it("perpendicular = 90°", () => {
    expect(angle2D({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBeCloseTo(90, 6);
  });

  it("45° e 135°", () => {
    expect(angle2D({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(45, 6);
    expect(angle2D({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 2 })).toBeCloseTo(135, 6);
  });

  it("é simétrico: a-b-c == c-b-a", () => {
    const a = { x: 0.31, y: 0.22 };
    const b = { x: 0.4, y: 0.55 };
    const c = { x: 0.62, y: 0.81 };
    expect(angle2D(a, b, c)).toBeCloseTo(angle2D(c, b, a)!, 9);
  });

  it("devolve null (nunca NaN) com vetor de comprimento zero", () => {
    expect(angle2D({ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 2 })).toBeNull();
    expect(angle2D({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 1 })).toBeNull();
  });

  it("não devolve NaN quando o cosseno estoura ±1 por ponto flutuante", () => {
    // Pontos quase colineares: sem clamp, acos(1.0000000000000002) = NaN.
    const result = angle2D({ x: 0, y: 0 }, { x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 });
    expect(result).not.toBeNull();
    expect(Number.isNaN(result!)).toBe(false);
    // Tolerância folgada de propósito: acos perde precisão perto de ±1 (erro da
    // ordem de √eps ≈ 1e-6 rad). Isso é da função, não do nosso clamp — e
    // 1e-6° não tem significado clínico nenhum. O que importa é não ser NaN.
    expect(result).toBeCloseTo(180, 4);
  });
});

describe("angle3D", () => {
  it("coincide com angle2D quando os pontos são coplanares em z=0", () => {
    const a = { x: 0.2, y: 0.1, z: 0 };
    const b = { x: 0.4, y: 0.5, z: 0 };
    const c = { x: 0.7, y: 0.3, z: 0 };
    expect(angle3D(a, b, c)).toBeCloseTo(angle2D(a, b, c)!, 9);
  });

  it("usa a profundidade quando ela existe", () => {
    const reto = angle3D({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
    expect(reto).toBeCloseTo(90, 6);
  });
});

describe("signedAngleToVertical — inclinação de tronco", () => {
  it("segmento vertical para cima = 0°", () => {
    expect(signedAngleToVertical({ x: 0.5, y: 0.8 }, { x: 0.5, y: 0.2 })).toBeCloseTo(0, 6);
  });

  it("inclinado 45° para a direita da imagem = +45°", () => {
    expect(signedAngleToVertical({ x: 0, y: 1 }, { x: 1, y: 0 })).toBeCloseTo(45, 6);
  });

  it("inclinado para a esquerda é negativo", () => {
    expect(signedAngleToVertical({ x: 1, y: 1 }, { x: 0, y: 0 })).toBeCloseTo(-45, 6);
  });
});

describe("signedDistanceToLine — base do valgo dinâmico", () => {
  it("ponto sobre a reta = 0", () => {
    expect(signedDistanceToLine({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 2 })).toBeCloseTo(0, 9);
  });

  it("magnitude correta e sinal indica o lado", () => {
    const dir = signedDistanceToLine({ x: 0.3, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 2 });
    const esq = signedDistanceToLine({ x: -0.3, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 2 });
    expect(Math.abs(dir!)).toBeCloseTo(0.3, 9);
    expect(Math.sign(dir!)).toBe(-Math.sign(esq!));
  });

  it("null quando a reta é degenerada", () => {
    expect(signedDistanceToLine({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBeNull();
  });
});

describe("movingMedian", () => {
  it("remove spike isolado sem achatar o resto", () => {
    const out = movingMedian([10, 10, 99, 10, 10], 3);
    expect(out[2]).toBe(10);
  });

  it("janela <= 1 devolve cópia intacta", () => {
    const input = [1, 2, 3];
    const out = movingMedian(input, 1);
    expect(out).toEqual(input);
    expect(out).not.toBe(input);
  });
});

describe("butterworthLowPass", () => {
  const fps = 30;
  const n = 300;
  const sinal = Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 0.5 * i) / fps));
  const ruido = Array.from({ length: n }, (_, i) => 0.3 * Math.sin((2 * Math.PI * 8 * i) / fps));
  const sujo = sinal.map((v, i) => v + ruido[i]);

  it("atenua ruído de 8 Hz preservando o sinal de 0,5 Hz", () => {
    const limpo = butterworthLowPass(sujo, 6, fps);
    // amplitude preservada no miolo (evita transiente de borda)
    const miolo = limpo.slice(60, n - 60);
    const mioloRef = sinal.slice(60, n - 60);
    const ampl = Math.max(...miolo) - Math.min(...miolo);
    const amplRef = Math.max(...mioloRef) - Math.min(...mioloRef);
    expect(ampl / amplRef).toBeGreaterThan(0.9);

    // erro residual bem menor que o ruído injetado
    const erro = Math.max(...miolo.map((v, i) => Math.abs(v - mioloRef[i])));
    expect(erro).toBeLessThan(0.1);
  });

  it("não desloca o pico no tempo (filtfilt cancela a fase)", () => {
    const idxPicoRef = sinal.indexOf(Math.max(...sinal.slice(0, 60)));
    const limpo = butterworthLowPass(sujo, 6, fps);
    const idxPico = limpo.indexOf(Math.max(...limpo.slice(0, 60)));
    // Um filtro causal simples atrasaria vários frames; aqui aceitamos ±1.
    expect(Math.abs(idxPico - idxPicoRef)).toBeLessThanOrEqual(1);
  });

  it("série curta demais passa intacta em vez de explodir", () => {
    expect(butterworthLowPass([1, 2], 6, 30)).toEqual([1, 2]);
  });

  it("cutoff acima de Nyquist não filtra", () => {
    expect(butterworthLowPass(sujo, 20, fps)).toEqual(sujo);
  });
});

describe("velocity e zeroCrossings", () => {
  it("rampa linear tem velocidade constante", () => {
    const v = velocity([0, 1, 2, 3, 4], 30);
    expect(v[2]).toBeCloseTo(30, 6);
  });

  it("detecta cruzamentos com o sentido certo", () => {
    const cruz = zeroCrossings([-1, -0.5, 0.5, 1, 0.2, -0.3]);
    expect(cruz).toHaveLength(2);
    expect(cruz[0].rising).toBe(true);
    expect(cruz[1].rising).toBe(false);
  });
});

describe("mean", () => {
  it("lista vazia = 0, sem NaN", () => {
    expect(mean([])).toBe(0);
  });
});
