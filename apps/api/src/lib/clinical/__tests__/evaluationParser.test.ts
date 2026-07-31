import { describe, it, expect } from "vitest";
import {
  buildEvaluationText,
  parseEvaluation,
  parseEvaluationText,
  sectionBody,
  sectionCodesOf,
} from "../evaluationParser";
import { toEvaluationRows } from "../extractionStore";
import { LEXICON_VERSION } from "../lexicon";

/**
 * Trechos LITERAIS de avaliações de produção (purple-union-72678311, formulário
 * "ZenFisio - Avaliação completa importada"). Copiados do banco, não escritos à
 * mão: é o corpus que define o formato, não a expectativa do parser.
 */
const REAL = {
  /** Blob com `HD:` — a grafia minoritária (5 de 271) da hipótese diagnóstica. */
  comHd:
    "25/10/24 (Amanda CREFITO 3/215954-F) \n HD: Coxartrose + Tendinite glutea \n Paciente sempre se queixou de dor lombar irradiada para MID, esse episódio foi se intensificando até a data de hoje, porém recentemente também começou a se queixar de dor em quadril E, realizou exame de imagens e relata ter diagnóstico de artrose na região do quadril, associados a tendinopatia glútea, então orientou fisio, após infiltrações caso não ocorra alívio dos sintomas. \n Remédios controlados: toma remédio de pressão\n Diabetes/hipertensão: tem HA\n Cirurgias Prévias: não \n Exames complementares: Não trouxe\n AVALIAÇÃO FÍSICA \n Inspeção \n Sem alteração\n Palpação \n Ausência de dor em palpação de lombar e quadril esquerdo.\n ADM \n Quadril: Abdução e adução: sem dor. Rotação ext e int: Não apresenta dor, mas com déficit de ADM.\n CCA \n CCF \n Agachamento: Com anteriorização do tronco, sem dor.\n Step down: Tremor bilateral com drop de pelve e perda de equilíbrio.\n Força \n Quadríceps: ok.\n IQT: enfraquecido bilateral, pior a E.\n Propriocepção \n Proprio uni: Leve a moderada instabilidade bilateral.\n Alongamento \n Quadriceps: Baixa flexibilidade bilateral.\n Testes especiais \n Lunge: 8 Bilateral.\n Pliometria \n PLANO TERAPÊUTICO \n Flexibilidade de tronco e MMII\n Fortalecimento IQT e quadril, manutenção de CORE\n Propriocepção e Coordenação",

  /** Blob completo com `Diagnóstico médico:` VAZIO e `Alongamento` vazio. */
  completa:
    "13/06/2024 (Amanda CREFITO 3/215954-F) - AVALIAÇÃO \n Idade: \n Diagnóstico médico: \n HMA: \n Paciente sempre realizou exercício físico, e esse ano iniciou a correr e recentemente correu 10km (não foi a primeira vez que correu esse km) há 15 dias, com inicio insidioso com dor em face lateral do joelho D, e no 8° km estava com dor muito intensa, mas mesmo assim continuou a correr, ao chegar em casa não sentiu nenhum desconforto, dois dias depois realizou treino de musculação de MMII e não relatou dor, no próximo treino de corrida sentiu novamente na corrida. Hoje sente dores para realizar treino de academia, e no dia 11/06 foi ao ortopedista e receitou tratamento medicamentoso, após a medicação não sente dores. \n Esporte: Academia e Corrida \n Remédios controlados: Puran (hipotiroidismo)\n Diabetes/hipertensão: Não\n Cirurgias Prévias: Não\n Exames complementares: Não \n AVALIAÇÃO FÍSICA \n Inspeção \n Menor volume muscular de quadríceps bilateral \n Palpação \n Tensão em trato bilateral, mais acentuada em MID\n ADM \n leve/moderado encurtamento de quadríceps \n CCA \n CCF \n Agachamento sem dor com desconforto em joelho D e Valgo de joelho D\n Step down MIE ok \n Step down MID drop de pelve e valgo de joelho com leve desconforto\n Avanço desconforto e valgo em MID\n Força \n Força diminuída em MMII, mais acentuado em IQT bilateral \n Propriocepção \n Moderada bilateral \n Alongamento \n Testes especiais \n LUNGE: ok bilateral \n Pliometria \n PLANO TERAPÊUTICO \n Analgesia em TIT D\n Fortalecimento de IQT e quadríceps bilateral \n Próprio\n Gesto esportivo - Corrida \n 3x na semana nas próxima 2 semanas e após 2x na semana \n CONDUTA",

  /** Formulário-modelo salvo em branco: só rótulos, quase nenhum valor. */
  modeloEmBranco:
    "Idade: \n Diagnóstico médico :\n HMA : \n AVD´s :\n Esporte :\n Remédios controlados :\n Diabetes/hipertensão :\n Cirurgias/lesões ortopédicas prévias :\n Exames complementares :\n AVALIAÇÃO FÍSICA \n Inspeção :\n Hiperextensão de joelhos\n Valgo\n Prono de pés\n Palpação :\n Tendão patelar:\n Tendão quadriciptal:\n Patela:\n Interlinha artcular:\n Pata de ganso:\n ADM :\n Flexão de joelho:\n Extensão de joelho:\n Flexão de quadril: \n Extensão de quadril:\n RI e RE quadril: \n Força :\n Flexores de quadril: \n Extensores de quadril: \n RI de quadril:\n RE de quadril: \n Adução de quadril: \n Abdução de quadril: \n QDP:\n IQT: \n CCA :\n CCF :\n Agachamento: \n Avanço: \n Step Down: \n Propriocepção :\n Proprio bi: \n Proprio Uni: \n Alongamento :\n Testes especiais :\n Gaveta anterior: \n Lachman: \n Gaveta posterior:\n McMurry: \n Apley Compressão: \n Tessália: \n Lunge: \n Pliometria \n Salto Bi: \n Salto Uni: \n PLANO TERAPÊUTICO",
};

/** A outra forma real do corpus: o ZenFisio já separou as seções em chaves. */
const REAL_FIELDS: Record<string, string> = {
  CCF: "má estratégia de agachamento , má propulsão no salto",
  end: "20:00:00",
  date: "16/09/2025",
  start: "19:00:00",
  Força:
    "Diminuição de força de gluteo máximo e médio bilateral (pior D) \n QDP: 6,42% \n IQT: 3.03% \n QDP/IQT: 44%",
  Esporte:
    "tênis - 2x na semana \n musculação- 3x na semana, vai para manutenção e com receio devido a cirurgia de quadril \n Corrida- 1x na semana",
  "HMA/HMP":
    "17/09/25- Isabella Colivati (CREFITO-3/421106-7) \n Paciente relata histórico de desconforto no quadril desde a juventude. Atualmente, queixa-se de desconforto em glúteo, posterior de coxa e tríceps sural direito.",
  Inspeção: "menor volume muscular em MID",
  Palpação: "Maior tensão em IQT D e gluteo médio D",
  "Convênio:*": "Particular",
  Frequência: "2x na semana",
  "diabetes-has": "309295",
  appointment_id: "203132766",
  Propriocepção: "ok, pode melhorar",
  "Cirurgias prévias": "Artroscopia de quadril em 2021 \n Subluxação de ombro D",
  "Plano terapêutico":
    "analgesia \n fortalecimento de IQT bilateral e quadril \n propriocepção \n gesto esportivo",
  "Diagnóstico Médico": "HD: tendinopatia de IQT D",
  btn_submit_appointment: "Salvar",
  "Encaminhamento profissional:": "Selecione o profissional que encaminhou",
  "Observações do agendamento:": "Tendinopatia em posterior da coxa",
};

describe("parseEvaluation — hipótese diagnóstica", () => {
  it("extrai `HD:` como hipótese diagnóstica", () => {
    const p = parseEvaluationText(REAL.comHd);
    expect(sectionCodesOf(p, "hipotese_diagnostica")).toContain("diagnostico_medico");
    expect(sectionBody(p, "diagnostico_medico")).toBe("Coxartrose + Tendinite glutea");
  });

  it("NÃO cria hipótese diagnóstica quando o rótulo está vazio", () => {
    // `Diagnóstico médico: ` sem valor é o caso mais comum de rótulo em branco.
    // Deduzir a hipótese a partir da HMA seria inventar diagnóstico.
    const p = parseEvaluationText(REAL.completa);
    expect(sectionCodesOf(p, "hipotese_diagnostica")).toEqual([]);
  });
});

describe("parseEvaluation — exame físico", () => {
  it("separa cada subseção do exame físico", () => {
    const p = parseEvaluationText(REAL.comHd);
    const codes = sectionCodesOf(p, "exame_fisico");
    expect(codes).toEqual(
      expect.arrayContaining([
        "inspecao",
        "palpacao",
        "adm",
        "ccf",
        "forca",
        "propriocepcao",
        "alongamento",
        "testes_especiais",
      ]),
    );
    expect(sectionBody(p, "palpacao")).toBe(
      "Ausência de dor em palpação de lombar e quadril esquerdo.",
    );
  });

  it("não inventa seção para cabeçalho sem corpo", () => {
    // `CCA` e `Pliometria` aparecem no texto mas sem nada embaixo.
    const p = parseEvaluationText(REAL.comHd);
    const codes = sectionCodesOf(p, "exame_fisico");
    expect(codes).not.toContain("cca");
    expect(codes).not.toContain("pliometria");
    // `AVALIAÇÃO FÍSICA` é só título de grupo aqui — o corpo é a subseção seguinte.
    expect(codes).not.toContain("avaliacao_fisica");
  });

  it("trata `Força diminuída em MMII` como CORPO da seção Força, não como cabeçalho", () => {
    // Sem separador (`:` ou `-`), o rótulo só é cabeçalho se a linha acabar ali.
    // É essa regra que impede o parser de picar o texto em pedaços errados.
    const p = parseEvaluationText(REAL.completa);
    expect(sectionBody(p, "forca")).toBe(
      "Força diminuída em MMII, mais acentuado em IQT bilateral",
    );
  });

  it("mantém `LUNGE:` dentro de Testes especiais em vez de abrir seção nova", () => {
    const p = parseEvaluationText(REAL.completa);
    expect(sectionBody(p, "testes_especiais")).toBe("LUNGE: ok bilateral");
  });

  it("`Alongamento` vazio entre duas seções não vira achado", () => {
    const p = parseEvaluationText(REAL.completa);
    expect(sectionCodesOf(p, "exame_fisico")).not.toContain("alongamento");
  });
});

describe("parseEvaluation — plano terapêutico", () => {
  it("extrai o plano até o fim do texto", () => {
    const p = parseEvaluationText(REAL.comHd);
    expect(sectionBody(p, "plano_terapeutico")).toBe(
      "Flexibilidade de tronco e MMII\n Fortalecimento IQT e quadril, manutenção de CORE\n Propriocepção e Coordenação",
    );
  });

  it("`CONDUTA` no fim do texto, sem corpo, não vira achado", () => {
    const p = parseEvaluationText(REAL.completa);
    expect(sectionCodesOf(p, "plano_terapeutico")).not.toContain("conduta");
    expect(sectionCodesOf(p, "plano_terapeutico")).toContain("plano_terapeutico");
  });
});

describe("parseEvaluation — antecedentes e anamnese", () => {
  it("extrai antecedentes com valor na mesma linha", () => {
    const p = parseEvaluationText(REAL.comHd);
    expect(sectionBody(p, "remedios_controlados")).toBe("toma remédio de pressão");
    expect(sectionBody(p, "diabetes_hipertensao")).toBe("tem HA");
    expect(sectionBody(p, "exames_complementares")).toBe("Não trouxe");
  });

  it("registra `não` como resposta legítima, não como ausência", () => {
    // "Cirurgias Prévias: Não" é informação: o profissional perguntou e anotou.
    const p = parseEvaluationText(REAL.completa);
    expect(sectionBody(p, "cirurgias_previas")).toBe("Não");
  });

  it("extrai HMA e Esporte como anamnese", () => {
    const p = parseEvaluationText(REAL.completa);
    expect(sectionCodesOf(p, "anamnese")).toEqual(expect.arrayContaining(["hma", "esporte"]));
    expect(sectionBody(p, "esporte")).toBe("Academia e Corrida");
  });
});

describe("parseEvaluation — formulário-modelo em branco", () => {
  it("aceita a única subseção que tem conteúdo e descarta as de rótulos vazios", () => {
    const p = parseEvaluationText(REAL.modeloEmBranco);
    expect(sectionBody(p, "inspecao")).toBe("Hiperextensão de joelhos\n Valgo\n Prono de pés");
    // "Tendão patelar:", "Flexão de joelho:" etc. são rótulos sem valor.
    const codes = sectionCodesOf(p, "exame_fisico");
    expect(codes).not.toContain("palpacao");
    expect(codes).not.toContain("adm");
    expect(codes).not.toContain("forca");
    expect(codes).not.toContain("testes_especiais");
  });

  it("não gera nenhuma hipótese diagnóstica nem plano", () => {
    const p = parseEvaluationText(REAL.modeloEmBranco);
    expect(sectionCodesOf(p, "hipotese_diagnostica")).toEqual([]);
    expect(sectionCodesOf(p, "plano_terapeutico")).toEqual([]);
  });
});

describe("parseEvaluation — auditabilidade", () => {
  it("todo offset aponta para o trecho literal do texto canônico", () => {
    for (const text of Object.values(REAL)) {
      const p = parseEvaluationText(text);
      expect(p.sections.length).toBeGreaterThan(0);
      for (const s of p.sections) {
        expect(p.text.slice(s.sourceStart, s.sourceEnd)).toBe(s.body);
      }
    }
  });

  it("mantém os offsets corretos apesar dos acentos", () => {
    // A dobra usada na comparação preserva o comprimento caractere a caractere;
    // um `normalize("NFD")` ingênuo deslocaria tudo depois do primeiro "ç".
    const p = parseEvaluationText(REAL.comHd);
    const insp = p.sections.find((s) => s.code === "inspecao")!;
    expect(REAL.comHd.slice(insp.sourceStart, insp.sourceEnd)).toBe("Sem alteração");
  });

  it("grava a versão do léxico e reconhece a assinatura CREFITO", () => {
    const p = parseEvaluationText(REAL.comHd);
    expect(p.lexiconVersion).toBe(LEXICON_VERSION);
    expect(p.signature?.crefito).toBe("215954");
    expect(p.headerDateText).toBe("25/10/24");
  });

  it("texto vazio não produz nada", () => {
    expect(parseEvaluationText("").sections).toEqual([]);
    expect(parseEvaluationText(null).hasAnyMatch).toBe(false);
    expect(parseEvaluation(null).sections).toEqual([]);
  });
});

describe("buildEvaluationText — a forma em campos separados", () => {
  it("produz as mesmas seções que o blob de texto livre", () => {
    const p = parseEvaluation({ fields: REAL_FIELDS });
    expect(sectionCodesOf(p, "exame_fisico")).toEqual(
      expect.arrayContaining(["inspecao", "palpacao", "ccf", "forca", "propriocepcao"]),
    );
    expect(sectionBody(p, "inspecao")).toBe("menor volume muscular em MID");
    expect(sectionBody(p, "plano_terapeutico")).toBe(
      "analgesia \n fortalecimento de IQT bilateral e quadril \n propriocepção \n gesto esportivo",
    );
    expect(sectionBody(p, "diagnostico_medico")).toBe("tendinopatia de IQT D");
    expect(sectionBody(p, "cirurgias_previas")).toBe(
      "Artroscopia de quadril em 2021 \n Subluxação de ombro D",
    );
  });

  it("é determinístico e independente da ordem das chaves do JSON", () => {
    const embaralhado = Object.fromEntries(Object.entries(REAL_FIELDS).reverse());
    expect(buildEvaluationText(embaralhado).text).toBe(buildEvaluationText(REAL_FIELDS).text);
  });

  it("ignora chaves de agendamento e não as reporta como desconhecidas", () => {
    const built = buildEvaluationText(REAL_FIELDS);
    expect(built.text).not.toContain("Salvar");
    expect(built.text).not.toContain("Selecione o profissional");
    expect(built.unknownFields).toEqual([]);
  });

  it("reporta chave nunca vista em vez de descartá-la em silêncio", () => {
    const p = parseEvaluation({ fields: { ...REAL_FIELDS, "Campo novo do formulário": "algo" } });
    expect(p.unknownFields).toContain("Campo novo do formulário");
  });

  it("agrupa checkboxes de comorbidade, cujo valor repete a própria chave", () => {
    const p = parseEvaluation({
      fields: { Diabetes: "Diabetes", Hipertensão: "Hipertensão", Ansiedade: "Ansiedade" },
    });
    expect(sectionBody(p, "comorbidade")).toBe("Ansiedade, Diabetes, Hipertensão");
  });

  it("preserva o blob `Avaliação` verbatim no início do texto canônico", () => {
    // Nos 271 registros que só têm o blob, o texto canônico É o blob — os
    // offsets apontam para o que o profissional escreveu, sem deslocamento.
    const built = buildEvaluationText({ Avaliação: REAL.comHd, date: "25/10/2024" });
    expect(built.text).toBe(REAL.comHd);
  });
});

describe("parseEvaluation — o que NUNCA é inferido", () => {
  it("não transforma o id opaco de `intensidade-da-dor-atualmente` em EVA", () => {
    // Os valores são 552782–552791: dez ids consecutivos que PARECEM uma escala
    // 0–10, mas o mapeamento não veio na importação. Mesma disciplina que impede
    // "muita dor" de virar um número no parser de evoluções.
    const p = parseEvaluation({
      fields: { "intensidade-da-dor-atualmente": "552791", "nivel-de-estresse-24": "552826" },
    });
    expect(p.lexicon.painReadings).toEqual([]);
    expect(toEvaluationRows(p).filter((r) => r.category === "eva")).toEqual([]);
    expect(p.unknownFields).toEqual([]);
  });

  it("não deduz plano terapêutico a partir do exame físico", () => {
    const p = parseEvaluationText(
      "AVALIAÇÃO FÍSICA \n Palpação \n Dor em IQT D \n PLANO TERAPÊUTICO",
    );
    expect(sectionCodesOf(p, "plano_terapeutico")).toEqual([]);
  });

  it("não gera indício de alta a partir de uma avaliação inicial", () => {
    // "alta" numa avaliação é expectativa ou prognóstico, nunca encerramento.
    const p = parseEvaluationText(
      "PLANO TERAPÊUTICO \n Fortalecimento de IQT \n Paciente deseja receber alta antes da maratona",
    );
    expect(toEvaluationRows(p).some((r) => r.category === "alta")).toBe(false);
  });
});

describe("toEvaluationRows — linhas gravadas", () => {
  it("gera uma linha por seção com o corpo literal como source_text", () => {
    const p = parseEvaluationText(REAL.comHd);
    const rows = toEvaluationRows(p);
    const palpacao = rows.find((r) => r.code === "palpacao")!;
    expect(palpacao.category).toBe("exame_fisico");
    expect(palpacao.sourceText).toBe("Ausência de dor em palpação de lombar e quadril esquerdo.");
    expect(REAL.comHd.slice(palpacao.sourceStart!, palpacao.sourceEnd!)).toBe(palpacao.sourceText);
  });

  it("reaproveita o léxico clínico sobre o mesmo texto", () => {
    // A avaliação diz onde dói e o plano diz o que fazer — os dois eixos ficam
    // consultáveis junto com as evoluções, no mesmo vocabulário.
    const rows = toEvaluationRows(parseEvaluationText(REAL.comHd));
    const regioes = rows.filter((r) => r.category === "regiao").map((r) => r.code);
    expect(regioes).toContain("isquiotibiais");
    expect(regioes).toContain("quadril");
    expect(rows.some((r) => r.category === "exercicio" && r.code === "agachamento")).toBe(true);
  });

  it("não repete a mesma (categoria, código, offset)", () => {
    const rows = toEvaluationRows(parseEvaluationText(REAL.comHd));
    const keys = rows.map((r) => `${r.category}|${r.code}|${r.sourceStart}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
