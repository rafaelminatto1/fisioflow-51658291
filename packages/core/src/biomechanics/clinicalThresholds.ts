/**
 * Limiares clínicos com lastro na literatura.
 *
 * Fonte única dos números que decidem se uma mudança medida é REAL ou ruído.
 * Cada constante carrega autor, ano, periódico e DOI — se um valor não tem
 * citação aqui, ele não deveria existir.
 *
 * Por que este arquivo existe: sem MDC, uma variação de 3° no FPPA entre duas
 * sessões apareceria como "melhora" na tela de comparação. O erro de medição
 * do próprio método é maior que isso. Declarar progresso onde há ruído é a
 * forma mais fácil de um software clínico mentir sem ninguém perceber.
 */

/** Diferença mínima detectável: abaixo disso, não há mudança demonstrável. */
export interface MetricThreshold {
  /** Menor mudança que se distingue do erro de medição. */
  mdc: number;
  /** Erro padrão da medida, para exibir junto do valor. */
  sem?: number;
  unit: "deg" | "%" | "spm" | "ms" | "m/s" | "m" | "/10";
  /** Citação completa. Vai no rodapé do laudo. */
  source: string;
}

export const CLINICAL_THRESHOLDS: Record<string, MetricThreshold> = {
  /**
   * FPPA — ângulo de projeção no plano frontal.
   *
   * ATENÇÃO: NÃO é o ângulo de valgo do joelho. Lopes et al. 2018 (meta-análise)
   * encontrou r=0,127 (p=0,094) entre FPPA 2D e o ângulo frontal 3D no
   * agachamento unipodal — correlação nula. O FPPA reflete majoritariamente
   * adução de quadril e rotação externa de tíbia. É marcador de padrão de
   * movimento, não medida articular.
   */
  fppa: {
    mdc: 9.2,
    sem: 3.33,
    unit: "deg",
    source:
      "Mansfield CJ et al., Knee 2022;36:87-96 (doi:10.1016/j.knee.2022.04.010); " +
      "Munro A et al., J Sport Rehabil 2012;21(1):7-11 (doi:10.1123/jsr.21.1.7)",
  },

  /** ROM de joelho no plano sagital — o mais confiável do conjunto. */
  knee_rom: {
    mdc: 5.0,
    sem: 2.5,
    unit: "deg",
    source:
      "Werner DM et al., Phys Ther Sport 2019;40:169-76 " +
      "(doi:10.1016/j.ptsp.2019.09.011); Turner JA et al., J Biomech 2024;171:112200 " +
      "(doi:10.1016/j.jbiomech.2024.112200) — MAE 3,85°, CMC sagital >0,94",
  },

  knee_flexion: {
    mdc: 5.0,
    sem: 2.5,
    unit: "deg",
    source: "Werner DM et al., Phys Ther Sport 2019;40:169-76 (doi:10.1016/j.ptsp.2019.09.011)",
  },

  /**
   * Quadril: erro maior que joelho e tornozelo, e degrada muito em movimento
   * rápido (RMSD até 15,9° na corrida).
   */
  hip_flexion: {
    mdc: 9.8,
    sem: 3.5,
    unit: "deg",
    source:
      "Song K et al., J Biomech 2023;157:111751 (doi:10.1016/j.jbiomech.2023.111751) — " +
      "RMSD 6,7–15,9°; Werner DM et al., Phys Ther Sport 2019;40:169-76",
  },

  ankle_dorsiflexion: {
    mdc: 5.9,
    sem: 2.5,
    unit: "deg",
    source: "Song K et al., J Biomech 2023;157:111751 (doi:10.1016/j.jbiomech.2023.111751)",
  },

  trunk_inclination: {
    mdc: 5.0,
    sem: 2.5,
    unit: "deg",
    source:
      "Harrington MS et al., J Sport Rehabil 2023;32(8):894-902 " +
      "(doi:10.1123/jsr.2022-0453) — SEM 1,2–4,9° no agachamento",
  },

  /**
   * Simetria. MDC alto de propósito: Reid 2007 mede 7,05–12,96% em hop tests.
   * E Lambert 2020 mostra que 93–98% dos atletas SAUDÁVEIS são assimétricos —
   * assimetria isolada não é achado patológico.
   */
  symmetry: {
    mdc: 13.0,
    sem: 5.59,
    unit: "%",
    source:
      "Reid A et al., Phys Ther 2007;87(3):337-49 (doi:10.2522/ptj.20060143) — " +
      "MDC90 7,05–12,96%; Lambert C et al., Int J Sports Med 2020;41(11):729-35 " +
      "(doi:10.1055/a-1171-2548)",
  },

  step_symmetry: {
    mdc: 13.0,
    sem: 5.59,
    unit: "%",
    source: "Reid A et al., Phys Ther 2007;87(3):337-49 (doi:10.2522/ptj.20060143)",
  },

  pelvic_drop: {
    mdc: 9.8,
    sem: 3.5,
    unit: "deg",
    source: "Werner DM et al., Phys Ther Sport 2019;40:169-76 (doi:10.1016/j.ptsp.2019.09.011)",
  },

  /** Cadência: derivada de eventos temporais, que são o mais confiável do 2D. */
  cadence: {
    mdc: 4.0,
    unit: "spm",
    source:
      "Varcin F & Boocock MG, Artif Intell Med 2025;173:103332 " +
      "(doi:10.1016/j.artmed.2025.103332) — ICC>0,9 em temporo-espaciais",
  },

  /** Dor relatada pelo paciente. MCID consagrado da EVA. */
  pain: {
    mdc: 2.0,
    unit: "/10",
    source: "MCID clássico da escala visual analógica de dor (2 pontos em 0–10)",
  },
};

export type DeltaInterpretation = "melhora" | "piora" | "sem_mudanca_detectavel" | "indeterminado";

/**
 * Métricas em que um valor MENOR é melhor.
 * Sem isto, reduzir o valgo apareceria como piora.
 */
const LOWER_IS_BETTER = new Set(["fppa", "trunk_inclination", "pain", "pelvic_drop"]);

/**
 * Decide se uma variação medida é mudança real ou ruído.
 *
 * Esta função existe para que NENHUMA tela desenhe seta de melhora abaixo da
 * diferença mínima detectável do método. É o guarda entre "o paciente
 * progrediu" e "a medição variou".
 *
 * `indeterminado` quando não há limiar publicado para a métrica — caso em que
 * a UI deve mostrar o número sem afirmar direção.
 */
export function interpretDelta(metricKey: string, delta: number): DeltaInterpretation {
  const threshold = CLINICAL_THRESHOLDS[metricKey];
  if (!threshold) return "indeterminado";
  if (!Number.isFinite(delta)) return "indeterminado";

  if (Math.abs(delta) < threshold.mdc) return "sem_mudanca_detectavel";

  const melhorou = LOWER_IS_BETTER.has(metricKey) ? delta < 0 : delta > 0;
  return melhorou ? "melhora" : "piora";
}

/** Rótulo em PT-BR para a interface. Sem emoji, conforme a marca. */
export function deltaLabel(interpretation: DeltaInterpretation): string {
  switch (interpretation) {
    case "melhora":
      return "Melhora";
    case "piora":
      return "Piora";
    case "sem_mudanca_detectavel":
      return "Sem mudança detectável";
    default:
      return "Sem referência";
  }
}

/** Texto explicativo para tooltip — o fisio precisa saber POR QUE não mudou. */
export function deltaExplanation(metricKey: string, delta: number): string {
  const threshold = CLINICAL_THRESHOLDS[metricKey];
  if (!threshold) {
    return "Não há diferença mínima detectável publicada para esta métrica.";
  }
  if (Math.abs(delta) < threshold.mdc) {
    return (
      `Variação de ${Math.abs(delta).toFixed(1)}${threshold.unit === "deg" ? "°" : threshold.unit}` +
      ` é menor que a diferença mínima detectável do método (${threshold.mdc}${threshold.unit === "deg" ? "°" : threshold.unit}).` +
      " Não é possível distinguir de erro de medição."
    );
  }
  return `Variação acima da diferença mínima detectável (${threshold.mdc}${threshold.unit === "deg" ? "°" : threshold.unit}).`;
}

/**
 * Nota de rodapé obrigatória em laudo biomecânico.
 * A ressalva sobre o FPPA não é jurídica — é factual.
 */
export const LAUDO_DISCLAIMER =
  "Métricas obtidas por estimativa de pose humana em vídeo 2D de câmera única. " +
  "Não substitui análise cinemática tridimensional laboratorial. O FPPA (ângulo de " +
  "projeção no plano frontal) é um marcador de padrão de movimento e não corresponde " +
  "ao ângulo frontal do joelho medido em 3D (Lopes et al., JOSPT 2018).";
