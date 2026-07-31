import { describe, it, expect } from "vitest";
import { parseEvolution, codesOf } from "../evolutionParser";
import { LEXICON_VERSION, NAO_RESOLVIDOS, REGIOES, CONDUTAS, EXERCICIOS } from "../lexicon";

/** Trechos literais de evoluções de produção (purple-union-72678311). */
const REAL = {
  massageGun:
    "Lib mio com massagen gun em paravertebral torácico, TFS bilateral, lombar e quadril \nLib Mio manual em paravertebral torácico, TFS bilateral, lombar e quadril \nTerapia combinada em paravertebral torácica D\nTração cervical \nMob torácica na roldana 3x10rep\nExercício escapular 3x10rep\nSiri thera band 3x30''\nTens Acup em paravertebral torácico e TFS bilateral sentado",
  eenm:
    "EENM em QDP D 4 eletrodos 10/5/5' realizando agachamento no espaldar 3x15rep\nEENM em IQT e quadríceps E realizando ponte com thera band",
  assinada:
    "29/07/2025 (Gabriele Nunes CREFITO 3/450129-F) \nPaciente não conseguiu se consultar no médico referente a dor em punho.\nLib mio manual em fáscia plantar alongada D\nLaser em punho E\nEsteira 10' a 10km/h",
  comEva:
    "Supino com halter de 3kg 2x10rep (Desconforto EVA 06/10)\nAgachamento com KTB 14kg 3x12rep\nBike 5'",
  qualitativa:
    "Paciente com muita dor muscular em cervical na última sessão\nLib Mio com massagen gun em lombar, quadril e TTFFSS\nTENS em TFS\nBota",
};

describe("parseEvolution — condutas e regiões", () => {
  it("distingue liberação miofascial com massage gun da manual", () => {
    const p = parseEvolution(REAL.massageGun);
    const condutas = codesOf(p, "conduta");
    expect(condutas).toContain("liberacao_miofascial_massage_gun");
    expect(condutas).toContain("liberacao_miofascial_manual");
  });

  it("reconhece TFS como trapézio fibras superiores", () => {
    const p = parseEvolution(REAL.massageGun);
    expect(codesOf(p, "regiao")).toContain("trapezio_fibras_superiores");
  });

  it("trata TTFFSS como o mesmo código de TFS (plural por duplicação)", () => {
    const p = parseEvolution(REAL.qualitativa);
    expect(codesOf(p, "regiao")).toContain("trapezio_fibras_superiores");
  });

  it("mapeia QDP para quadríceps, não para quadrado plantar", () => {
    const p = parseEvolution(REAL.eenm);
    const regioes = codesOf(p, "regiao");
    expect(regioes).toContain("quadriceps");
    expect(regioes).toContain("isquiotibiais");
  });

  it("identifica EENM, TENS, laser e tração como condutas distintas", () => {
    expect(codesOf(parseEvolution("EENM em QDP"), "conduta")).toContain(
      "eletroestimulacao_neuromuscular",
    );
    expect(codesOf(parseEvolution("Tens Acup em lombar"), "conduta")).toContain("tens");
    expect(codesOf(parseEvolution("Laser em punho E"), "conduta")).toContain("laser");
    expect(codesOf(parseEvolution("Tração cervical"), "conduta")).toContain("tracao");
  });
});

describe("parseEvolution — dosagem e carga", () => {
  it("extrai séries × repetições", () => {
    const p = parseEvolution(REAL.massageGun);
    expect(p.dosages).toContainEqual(expect.objectContaining({ sets: 3, reps: 10 }));
    expect(p.dosages).toContainEqual(expect.objectContaining({ sets: 3, reps: 30 }));
  });

  it("extrai carga em kg", () => {
    const p = parseEvolution(REAL.comEva);
    expect(p.loads.map((l) => l.value)).toEqual(expect.arrayContaining([3, 14]));
  });

  it("ignora números que não são dosagem plausível", () => {
    const p = parseEvolution("protocolo 2026x2027 revisado");
    expect(p.dosages).toHaveLength(0);
  });
});

describe("parseEvolution — EVA", () => {
  it("extrai EVA numérica escrita no texto, com a escala", () => {
    const p = parseEvolution(REAL.comEva);
    expect(p.painReadings).toHaveLength(1);
    expect(p.painReadings[0]).toMatchObject({ value: 6, maxScale: 10 });
  });

  it("extrai EVA sem escala explícita", () => {
    const p = parseEvolution("sentiu incomodo EVA 4 para realizar o exercício");
    expect(p.painReadings[0]).toMatchObject({ value: 4, maxScale: undefined });
  });

  it("NÃO inventa número a partir de descrição qualitativa", () => {
    // Guarda central: "muita dor" nunca pode virar um valor de EVA.
    const p = parseEvolution(REAL.qualitativa);
    expect(p.painReadings).toHaveLength(0);
  });

  it("descarta EVA fora da escala declarada", () => {
    const p = parseEvolution("EVA 9/5 registrado por engano");
    expect(p.painReadings).toHaveLength(0);
  });
});

describe("parseEvolution — assinatura e auditabilidade", () => {
  it("extrai nome e CREFITO da assinatura", () => {
    const p = parseEvolution(REAL.assinada);
    expect(p.signature?.crefito).toBe("450129");
    expect(p.signature?.name).toContain("Gabriele Nunes");
  });

  it("cada extração aponta para o trecho literal de origem", () => {
    const p = parseEvolution(REAL.assinada);
    for (const e of p.extractions) {
      expect(REAL.assinada.slice(e.sourceStart, e.sourceEnd)).toBe(e.sourceText);
    }
  });

  it("carimba a versão do léxico, para a camada derivada ser reconstruível", () => {
    expect(parseEvolution("Lib mio").lexiconVersion).toBe(LEXICON_VERSION);
  });
});

describe("parseEvolution — bordas", () => {
  it("texto vazio ou nulo não quebra e não gera extração", () => {
    for (const v of [null, undefined, "", "   "]) {
      const p = parseEvolution(v);
      expect(p.hasAnyMatch).toBe(false);
      expect(p.extractions).toHaveLength(0);
    }
  });

  it("sinaliza texto sem nenhum termo do léxico", () => {
    expect(parseEvolution("Paciente remarcou para semana que vem.").hasAnyMatch).toBe(false);
  });

  it("não casa sigla dentro de outra palavra", () => {
    // "SI" (sacroilíaca) não pode casar em "SIMÉTRICO".
    expect(codesOf(parseEvolution("Marcha simétrica e sem alterações"), "regiao")).not.toContain(
      "sacroiliaca",
    );
  });
});

describe("siglas confirmadas pela fisioterapeuta em 31/07/2026", () => {
  it("PQD é o exercício paraquedista, NÃO o quadríceps", () => {
    // Anagrama perigoso: QDP = quadríceps, PQD = paraquedista. Coexistem no mesmo
    // texto ("EENM Cont em Quadríceps D ... PQD 2x1'"), então unificá-los por
    // semelhança gráfica corromperia tanto conduta quanto músculo-alvo.
    const p = parseEvolution("EENM em lombar realizando PQD 3x30''");
    expect(codesOf(p, "exercicio")).toContain("paraquedista");
    expect(codesOf(p, "regiao")).not.toContain("quadriceps");
  });

  it("QDP continua sendo quadríceps e não vira exercício", () => {
    const p = parseEvolution("EENM em QDP D realizando cad ext");
    expect(codesOf(p, "regiao")).toContain("quadriceps");
    expect(codesOf(p, "exercicio")).not.toContain("paraquedista");
  });

  it("RL (rotação lateral) e RE (rotação externa) caem no mesmo código", () => {
    // Sinônimos anatômicos. Códigos distintos fragmentariam o mesmo achado.
    expect(codesOf(parseEvolution("Mob de RL de GUD com bastão"), "plano")).toContain(
      "rotacao_externa",
    );
    expect(codesOf(parseEvolution("Mob de rotação externa de ombro"), "plano")).toContain(
      "rotacao_externa",
    );
  });

  it("RM é rotação medial, não repetição máxima", () => {
    // Erro anterior meu: RM estava catalogado como "repetição máxima". Todos os
    // contextos do corpus são de movimento ("Ganho de ADM de RL e RM passiva").
    const codes = codesOf(parseEvolution("Ganho de ADM de RL e RM passiva em DD"), "plano");
    expect(codes).toContain("rotacao_interna");
    expect(codes).toContain("rotacao_externa");
  });

  it("GU/GUD são glenoumeral, mapeados para ombro", () => {
    expect(codesOf(parseEvolution("Mob de RL e RM de GU D"), "regiao")).toContain("ombro");
    expect(codesOf(parseEvolution("abd GUD 90°"), "regiao")).toContain("ombro");
  });
});

describe("exercícios", () => {
  it("identifica os exercícios de estabilização usados junto do paraquedista", () => {
    const p = parseEvolution("Prancha 1' / PQD 30\" / Perdigueiro 3x10rep / Dead Bug 3x30''");
    const ex = codesOf(p, "exercicio");
    expect(ex).toEqual(
      expect.arrayContaining(["prancha", "paraquedista", "perdigueiro", "dead_bug"]),
    );
  });

  it("separa exercício de conduta na mesma frase", () => {
    const p = parseEvolution("EENM em QDP D realizando agachamento no espaldar 3x15rep");
    expect(codesOf(p, "conduta")).toContain("eletroestimulacao_neuromuscular");
    expect(codesOf(p, "exercicio")).toContain("agachamento");
    expect(codesOf(p, "regiao")).toContain("quadriceps");
  });
});

describe("linha de base (LB:)", () => {
  it("extrai o descritor e o ângulo quando há medida", () => {
    const p = parseEvolution("LB: Abd GUD - 100°\nLib mio manual em TFS");
    expect(p.baselines).toHaveLength(1);
    expect(p.baselines[0]).toMatchObject({ descriptor: "Abd GUD - 100°", value: 100, unit: "graus" });
  });

  it("aceita linha de base qualitativa sem inventar número", () => {
    // "Dor ao subir escada" é linha de base legítima; convertê-la num valor
    // seria fabricar medida.
    const p = parseEvolution("LB: Dor ao subir escada / Dor ao caminhar");
    expect(p.baselines[0].descriptor).toContain("Dor ao subir escada");
    expect(p.baselines[0].value).toBeUndefined();
  });

  it("ignora LB: sem descritor", () => {
    expect(parseEvolution("LB:\nLib mio").baselines).toHaveLength(0);
  });

  it("aceita as variações de grafia de grau vistas no corpus", () => {
    for (const t of ["LB: Flx 45°", "LB: flexão a 45º", "LB: abd 45 graus"]) {
      expect(parseEvolution(t).baselines[0]?.value).toBe(45);
    }
  });
});

describe("menções de alta", () => {
  it("reconhece alta declarada", () => {
    const p = parseEvolution("Paciente relatou estar bem, sem dores ao repouso, esta de ALTA!!!!!!");
    expect(p.dischargeMentions[0].kind).toBe("alta_declarada");
  });

  it("reconhece alta médica", () => {
    const p = parseEvolution("Teve alta médica para fazer fisio com 8 semanas.");
    expect(p.dischargeMentions[0].kind).toBe("alta_medica");
  });

  it("reconhece alta parcial (por região, tratamento continua)", () => {
    // Trecho real: alta de uma região sem encerrar o tratamento. Tratar como
    // alta do paciente encerraria um caso que segue ativo.
    const p = parseEvolution(
      "Paciente está de alta do ombro. Próximas sessões serão para fortalecimento de MMSS e tto de lombar.",
    );
    expect(p.dischargeMentions[0].kind).toBe("alta_parcial");
  });

  it("NÃO confunde 'alta' adjetivo com encerramento", () => {
    // No corpus, "alta" é quase sempre adjetivo. Este é o falso positivo que
    // inflou minha primeira contagem de 21 para 1.458.
    for (const t of [
      "Prancha alta com remada serrote 3x10rep",
      "Combinada em TFS e torácica alta",
      "não foi um treino de alta intensidade",
      "Laser em lombar alta",
      "Remada alta na diagonal escapular",
    ]) {
      expect(parseEvolution(t).dischargeMentions).toHaveLength(0);
    }
  });

  it("NÃO trata 'última sessão' como alta — no corpus significa sessão anterior", () => {
    const p = parseEvolution("Paciente relata melhora dos sintomas após a última sessão.");
    expect(p.dischargeMentions).toHaveLength(0);
  });

  it("não duplica a mesma menção em dois tipos", () => {
    const p = parseEvolution("Paciente está de alta do joelho D.");
    expect(p.dischargeMentions).toHaveLength(1);
  });
});

describe("léxico", () => {
  it("não tem códigos duplicados dentro da mesma categoria", () => {
    for (const list of [CONDUTAS, REGIOES]) {
      const codes = list.map((e) => e.code);
      expect(new Set(codes).size).toBe(codes.length);
    }
  });

  it("nenhuma sigla não confirmada gera extração", () => {
    // Invariante permanente: o que está em NAO_RESOLVIDOS não pode ter virado
    // padrão em nenhuma categoria — um palpite não pode virar dado clínico.
    const todos = [...CONDUTAS, ...REGIOES, ...EXERCICIOS].flatMap((e) =>
      e.patterns.map((p) => p.toUpperCase()),
    );
    for (const { sigla } of NAO_RESOLVIDOS) {
      expect(todos).not.toContain(sigla.toUpperCase());
    }
  });
});
