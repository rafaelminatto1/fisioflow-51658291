/**
 * Parser determinístico das avaliações importadas do ZenFisio.
 *
 * Why: as 531 avaliações do formulário "ZenFisio - Avaliação completa importada"
 * vivem em `patient_evaluation_responses.responses` como JSON, mas o conteúdo
 * clínico é texto livre. Elas existem em DUAS formas, e as duas são reais:
 *
 *  1. 271 registros com um único blob em `fields['Avaliação']`, estruturado por
 *     cabeçalhos de seção que a própria clínica padronizou (`AVALIAÇÃO FÍSICA`,
 *     `Inspeção`, `Palpação`, `ADM`, `CCA`, `CCF`, `Força`, `Propriocepção`,
 *     `Alongamento`, `Testes especiais`, `Pliometria`, `PLANO TERAPÊUTICO`).
 *  2. 260 registros em que o próprio ZenFisio já separou essas mesmas seções em
 *     chaves distintas do JSON (`HMA/HMP`, `Palpação:`, `Força`, ...).
 *
 * A estratégia é reduzir as duas formas a UM texto canônico
 * (`buildEvaluationText`) e rodar um único parser de seções sobre ele. O texto
 * canônico é função pura do JSON bruto — reprodutível a qualquer momento — e é
 * a ele que `sourceStart`/`sourceEnd` se referem. O JSON bruto nunca é alterado.
 *
 * O que NÃO faz: inferir. Seção ausente é seção ausente. Seção presente mas com
 * o corpo vazio (o formulário-modelo em branco, que existe no corpus) não vira
 * achado. E os campos cujo valor é um id opaco do ZenFisio
 * (`intensidade-da-dor-atualmente` = "552791") são deliberadamente descartados:
 * parecem uma escala 0–10, mas o mapeamento não veio na importação. Chutar ali
 * seria exatamente o erro que o parser de evoluções evita ao recusar transformar
 * "muita dor" num valor de EVA.
 */

import { LEXICON_VERSION } from "./lexicon";
import { parseEvolution, type Extraction, type ParsedEvolution } from "./evolutionParser";

export type EvaluationCategory =
  | "hipotese_diagnostica"
  | "anamnese"
  | "antecedente"
  | "exame_fisico"
  | "plano_terapeutico";

export interface EvaluationSection {
  category: EvaluationCategory;
  /** Código estável da seção (`palpacao`, `plano_terapeutico`, ...). */
  code: string;
  /** Rótulo literal como aparece no texto — preserva a grafia do profissional. */
  headerText: string;
  /** Corpo literal da seção, sem o cabeçalho, com bordas aparadas. */
  body: string;
  /** Offsets do corpo dentro do texto canônico. */
  sourceStart: number;
  sourceEnd: number;
}

export interface ParsedEvaluation {
  lexiconVersion: string;
  /** Texto canônico sobre o qual todos os offsets foram calculados. */
  text: string;
  sections: EvaluationSection[];
  /**
   * Achados do léxico clínico sobre o mesmo texto canônico (região, conduta,
   * exercício, carga, EVA escrita). Reaproveita o parser de evoluções em vez de
   * duplicar o vocabulário — os offsets batem porque o texto é o mesmo.
   */
  lexicon: ParsedEvolution;
  /** Assinatura `(Nome CREFITO 3/XXXXXX-F)` do cabeçalho, quando presente. */
  signature?: ParsedEvolution["signature"];
  /** Data escrita no cabeçalho, literal — não normalizada, não inferida. */
  headerDateText?: string;
  /** Chaves do JSON que o parser não reconheceu — insumo para revisão humana. */
  unknownFields: string[];
  hasAnyMatch: boolean;
}

// ===========================================================================
// CABEÇALHOS DE SEÇÃO
// ===========================================================================

interface SectionHeader {
  /** `null` = serve apenas de fronteira; não gera extração. */
  category: EvaluationCategory | null;
  code: string;
  /**
   * Grafias observadas no corpus. Escritas sem acento de propósito: a
   * comparação roda sobre uma versão "dobrada" do texto (minúsculas, sem
   * diacríticos) que preserva os índices caractere a caractere.
   */
  patterns: string[];
  /**
   * Encerra o valor na quebra de linha em vez de ir até o próximo cabeçalho.
   *
   * Necessário para diagnóstico: no corpus, `HD: Coxartrose + Tendinite glutea`
   * é seguido pela narrativa da história clínica SEM cabeçalho próprio. Sem
   * este corte, o campo "diagnóstico" receberia um parágrafo inteiro de
   * anamnese — dado errado no lugar errado, não apenas verboso.
   */
  singleLine?: boolean;
}

/**
 * Lista FECHADA. É deliberado que rótulos internos frequentes — `Lunge:`,
 * `Salto Bi:`, `Treino A:`, `Tendão patelar:` — fiquem de fora: eles são
 * conteúdo do corpo da seção, não fronteira. Tratar qualquer `Palavra:` como
 * cabeçalho fragmentaria "Testes especiais" em uma dúzia de pedaços.
 */
const SECTION_HEADERS: SectionHeader[] = [
  // --- Hipótese diagnóstica -------------------------------------------------
  {
    category: "hipotese_diagnostica",
    code: "diagnostico_medico",
    // 218 das 271 avaliações em texto livre trazem "Diagnóstico médico:".
    // `HD:` (o formato do exemplo canônico) aparece em apenas 5 — os dois
    // convivem e ambos são o mesmo campo.
    patterns: ["diagnostico medico", "diagnostico medico", "dx medico", "hd"],
    singleLine: true,
  },
  {
    category: "hipotese_diagnostica",
    code: "diagnostico_profissional",
    patterns: [
      "diagnostico do profissional",
      "diagnostico fisioterapeutico",
      "hipotese diagnostica",
      "hipoteses diagnosticas",
    ],
    singleLine: true,
  },

  // --- Anamnese -------------------------------------------------------------
  {
    category: "anamnese",
    code: "hma",
    patterns: ["hma/hmp", "hma / hmp", "hmp", "hma", "historia da doenca atual"],
  },
  {
    category: "anamnese",
    code: "avd",
    // "AVD´s" usa acento agudo como apóstrofo no corpus inteiro; a dobra
    // normaliza ´ ` ' ’ para o mesmo caractere.
    patterns: ["avd's / esporte", "avd's/esporte", "avd's", "avds", "avd"],
  },
  {
    category: "anamnese",
    code: "esporte",
    patterns: ["esporte", "esportes", "atividade fisica", "atividades fisica", "atividades fisicas"],
  },
  { category: "anamnese", code: "sono", patterns: ["qualidade de sono", "sono"] },
  { category: "anamnese", code: "tipo_dor", patterns: ["tipo de dor"] },
  {
    category: "anamnese",
    code: "observacoes_exames",
    patterns: ["observacoes exames", "observacoes exame", "observacao exames"],
  },

  // --- Antecedentes ---------------------------------------------------------
  {
    category: "antecedente",
    code: "remedios_controlados",
    patterns: ["remedios controlados", "remedio controlado", "remedios controlado"],
  },
  {
    category: "antecedente",
    code: "medicamentos_continuos",
    patterns: ["medicamentos de uso continuo", "medicamento de uso continuo", "medicacoes de uso continuo"],
  },
  {
    category: "antecedente",
    code: "diabetes_hipertensao",
    patterns: [
      "diabetes/hipertensao/hipotiroidismo",
      "diabetes/hipertensao/hipotireoidismo",
      "diabetes/hipertensao",
      "diabetes / hipertensao",
      "diabetes/has",
    ],
  },
  {
    category: "antecedente",
    code: "cirurgias_previas",
    patterns: [
      "cirurgias/lesoes ortopedicas previas",
      "cirurgias / lesoes ortopedicas previas",
      "cirurgias previas",
      "cirurgia previa",
    ],
  },
  {
    category: "antecedente",
    code: "exames_complementares",
    patterns: ["exames complementares", "exame complementar", "exames complementar"],
  },
  {
    category: "antecedente",
    code: "tratamentos_previos",
    patterns: ["tratamentos previos?", "tratamentos previos", "tratamento previo"],
  },
  {
    category: "antecedente",
    code: "historico_cancer",
    patterns: ["historico de cancer/ caso na familia?", "historico de cancer", "historico de cancer/ caso na familia"],
  },
  { category: "antecedente", code: "comorbidade", patterns: ["comorbidades", "comorbidade"] },
  { category: "antecedente", code: "nega", patterns: ["nega"] },

  // --- Exame físico ---------------------------------------------------------
  {
    category: "exame_fisico",
    code: "avaliacao_fisica",
    // Na maioria dos registros é só um título de grupo, seguido logo pelas
    // subseções — nesse caso o corpo sai vazio e nada é extraído. Quando o
    // profissional escreve o exame direto embaixo, vira o achado geral.
    patterns: ["avaliacao fisica", "exame fisico"],
  },
  { category: "exame_fisico", code: "inspecao", patterns: ["inspecao"] },
  { category: "exame_fisico", code: "palpacao", patterns: ["palpacao"] },
  { category: "exame_fisico", code: "adm", patterns: ["amplitude de movimento", "adm"] },
  { category: "exame_fisico", code: "cca", patterns: ["cadeia cinetica aberta", "cca"] },
  { category: "exame_fisico", code: "ccf", patterns: ["cadeia cinetica fechada", "ccf"] },
  {
    category: "exame_fisico",
    code: "forca",
    patterns: ["teste de forca", "testes de forca", "forca"],
  },
  { category: "exame_fisico", code: "propriocepcao", patterns: ["propriocepcao"] },
  { category: "exame_fisico", code: "alongamento", patterns: ["alongamento"] },
  {
    category: "exame_fisico",
    code: "testes_especiais",
    patterns: ["testes especiais", "teste especial", "testes especias", "testes especiais"],
  },
  { category: "exame_fisico", code: "pliometria", patterns: ["pliometria"] },

  // --- Plano ----------------------------------------------------------------
  {
    category: "plano_terapeutico",
    code: "plano_terapeutico",
    patterns: ["plano terapeutico", "plano de tratamento", "plano terapeutica"],
  },
  { category: "plano_terapeutico", code: "conduta", patterns: ["condutas", "conduta"] },
  {
    category: "plano_terapeutico",
    code: "orientacoes",
    patterns: ["orientacoes", "orientacao"],
  },
  { category: "plano_terapeutico", code: "frequencia", patterns: ["frequencia"] },
  { category: "plano_terapeutico", code: "objetivo", patterns: ["objetivos", "objetivo"] },
  {
    category: "plano_terapeutico",
    code: "encaminhamento_medico",
    patterns: ["encaminhamento medico"],
  },

  // --- Somente fronteira ----------------------------------------------------
  // "Idade:" abre quase toda avaliação. Não é achado clínico, mas precisa
  // existir aqui para que o preâmbulo não seja confundido com outra seção.
  { category: null, code: "idade", patterns: ["idade"] },
];

/**
 * Dobra o texto para comparação: minúsculas, sem diacríticos, apóstrofos
 * unificados — preservando o comprimento caractere a caractere.
 *
 * O `NFD` normal quebraria os offsets (ã vira dois code points). Por isso a
 * dobra é feita por caractere, sempre devolvendo exatamente um.
 */
function fold(text: string): string {
  let out = "";
  for (const ch of text) {
    // Par substituto (emoji): devolve intacto, senão o offset escorregaria.
    if (ch.length > 1) {
      out += ch;
      continue;
    }
    if (ch === "´" || ch === "`" || ch === "'" || ch === "’") {
      out += "'";
      continue;
    }
    const decomposed = ch.normalize("NFD");
    // Um caractere composto (ç, ã) decompõe em base + diacrítico: fica a base.
    const base = decomposed.length > 1 ? decomposed[0] : ch;
    const lower = base.toLowerCase();
    out += lower.length === 1 ? lower : base;
  }
  return out;
}

interface CompiledHeader {
  header: SectionHeader;
  /** Ordenado por especificidade: o padrão mais longo tenta primeiro. */
  regexes: RegExp[];
  length: number;
}

const COMPILED_HEADERS: CompiledHeader[] = SECTION_HEADERS.flatMap((header) => {
  const sorted = [...new Set(header.patterns.map(fold))].sort((a, b) => b.length - a.length);
  return sorted.map((pattern) => ({
    header,
    length: pattern.length,
    regexes: [
      new RegExp(
        // Rótulo tolerante a espaçamento, seguido de separador opcional.
        // Os grupos existem para localizar onde o valor começa na linha.
        `^(${pattern
          .split(/\s+/)
          .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("\\s+")})(\\s*)([:\\-–—]?)(\\s*)(.*)$`,
      ),
    ],
  }));
}).sort((a, b) => b.length - a.length);

interface HeaderHit {
  header: SectionHeader;
  headerText: string;
  /** Offset do início do valor (após o rótulo e o separador). */
  valueStart: number;
  /** Offset do início da linha do cabeçalho — fim do corpo da seção anterior. */
  lineStart: number;
}

/**
 * Reconhece um cabeçalho no início de uma linha.
 *
 * Regra que evita o falso positivo mais perigoso do corpus: sem separador
 * (`:` ou `-`), o rótulo só é cabeçalho se a linha terminar ali. Assim
 * "Força diminuída em MMII" continua sendo CORPO da seção Força, e não abre uma
 * seção nova engolindo o resto.
 */
function matchHeader(line: string, lineStart: number): HeaderHit | null {
  const indent = /^[\s ]*[-•*–]?[\s ]*/.exec(line)?.[0] ?? "";
  const content = line.slice(indent.length);
  const folded = fold(content);

  for (const { header, regexes } of COMPILED_HEADERS) {
    for (const re of regexes) {
      const m = re.exec(folded);
      if (!m) continue;
      const [, label, gap1, sep, gap2, rest] = m;
      if (sep === "" && rest.trim() !== "") continue;
      const offsetInContent = label.length + gap1.length + sep.length + gap2.length;
      return {
        header,
        headerText: content.slice(0, label.length + gap1.length + sep.length),
        valueStart: lineStart + indent.length + offsetInContent,
        lineStart,
      };
    }
  }
  return null;
}

/**
 * Um corpo só conta como achado se sobrar algo além de rótulos vazios.
 *
 * O corpus tem o formulário-modelo em branco salvo como avaliação: linhas como
 * "Tendão patelar:" sem valor nenhum. Contá-las como achado inflaria a
 * cobertura sem que exista informação clínica.
 */
function hasClinicalContent(body: string): boolean {
  for (const rawLine of body.split("\n")) {
    const line = rawLine.replace(/\r/g, "").trim().replace(/^[-•*–]\s*/, "");
    if (line.length < 2) continue;
    if (/^[^:]{1,45}:\s*$/.test(line)) continue;
    return true;
  }
  return false;
}

/** Data escrita no cabeçalho da avaliação, literal (dd/mm/aa ou dd/mm/aaaa). */
const HEADER_DATE_RE = /^\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/;

// ===========================================================================
// PARSER DE SEÇÕES
// ===========================================================================

/** Extrai as seções de um texto de avaliação já canônico. */
export function parseEvaluationSections(text: string): EvaluationSection[] {
  const hits: HeaderHit[] = [];
  let offset = 0;
  // O plano terapêutico é a última seção e lista condutas cujos nomes coincidem
  // com subseções do exame físico — "propriocepção", "alongamento", "força".
  // Sem este estado, a primeira dessas linhas dentro do plano seria lida como
  // cabeçalho e truncaria o plano ali.
  let dentroDoPlano = false;
  for (const line of text.split("\n")) {
    const hit = matchHeader(line, offset);
    if (hit) {
      if (hit.header.category === "plano_terapeutico") dentroDoPlano = true;
      const subsecaoDeExame = hit.header.category === "exame_fisico";
      if (!(dentroDoPlano && subsecaoDeExame)) hits.push(hit);
    }
    offset += line.length + 1; // +1 pelo "\n" consumido pelo split
  }

  const sections: EvaluationSection[] = [];
  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i];
    if (!hit.header.category) continue;
    const proximoCabecalho = i + 1 < hits.length ? hits[i + 1].lineStart : text.length;
    // Cabeçalho de linha única para no primeiro "\n"; os demais vão até o
    // próximo cabeçalho conhecido.
    const fimDaLinha = text.indexOf("\n", hit.valueStart);
    const end = hit.header.singleLine
      ? Math.min(fimDaLinha === -1 ? text.length : fimDaLinha, proximoCabecalho)
      : proximoCabecalho;
    const rawBody = text.slice(hit.valueStart, Math.max(hit.valueStart, end));

    // Apara as bordas mantendo os offsets coerentes com o texto original.
    const leading = rawBody.length - rawBody.trimStart().length;
    const body = rawBody.trim();
    if (body.length === 0 || !hasClinicalContent(body)) continue;

    sections.push({
      category: hit.header.category,
      code: hit.header.code,
      headerText: hit.headerText.trim(),
      body,
      sourceStart: hit.valueStart + leading,
      sourceEnd: hit.valueStart + leading + body.length,
    });
  }
  return sections;
}

// ===========================================================================
// TEXTO CANÔNICO A PARTIR DO JSON
// ===========================================================================

/** Chaves do formulário que não carregam conteúdo clínico. */
const IGNORED_FIELDS = new Set(
  [
    "date",
    "start",
    "end",
    "appointment_id",
    "btn_submit_appointment",
    "convenio:*",
    "encaminhamento profissional:",
    "observacoes do agendamento:",
    "procedimento:",
    "outros",
    "outros:",
    // Ids opacos de opção do ZenFisio. `intensidade-da-dor-atualmente` tem 10
    // valores consecutivos (552782–552791) e parece uma escala 0–10, mas o
    // mapeamento não veio na importação. Adivinhar seria inventar dado.
    "diabetes-has",
    "nivel-de-estresse-24",
    "intensidade-da-dor-atualmente",
  ].map((k) => fold(k)),
);

/** Chave do JSON → seção canônica. A ordem do array define a ordem do texto. */
const FIELD_SECTIONS: Array<{ keys: string[]; code: string; label: string }> = [
  { keys: ["diagnóstico médico"], code: "diagnostico_medico", label: "Diagnóstico médico" },
  { keys: ["diagnóstico do profissional:"], code: "diagnostico_profissional", label: "Diagnóstico do profissional" },
  { keys: ["hma/hmp"], code: "hma", label: "HMA" },
  { keys: ["esporte"], code: "esporte", label: "Esporte" },
  { keys: ["sono:"], code: "sono", label: "Sono" },
  { keys: ["tipo de dor"], code: "tipo_dor", label: "Tipo de dor" },
  { keys: ["remédios controlados"], code: "remedios_controlados", label: "Remédios controlados" },
  { keys: ["medicamentos de uso continuo:"], code: "medicamentos_continuos", label: "Medicamentos de uso continuo" },
  { keys: ["cirurgias prévias", "cirurgias prévias:"], code: "cirurgias_previas", label: "Cirurgias prévias" },
  { keys: ["tratamentos prévios?"], code: "tratamentos_previos", label: "Tratamentos prévios" },
  {
    keys: ["histórico de c&acirc;ncer/ caso na família?", "histórico de câncer/ caso na família?"],
    code: "historico_cancer",
    label: "Histórico de cancer",
  },
  { keys: ["observações exames", "observações exame"], code: "observacoes_exames", label: "Observações exames" },
  { keys: ["inspeção", "inspeção:"], code: "inspecao", label: "Inspeção" },
  { keys: ["palpação", "palpação:"], code: "palpacao", label: "Palpação" },
  { keys: ["adm", "adm:"], code: "adm", label: "ADM" },
  { keys: ["cca"], code: "cca", label: "CCA" },
  { keys: ["ccf", "ccf:"], code: "ccf", label: "CCF" },
  { keys: ["força", "teste de força:"], code: "forca", label: "Força" },
  { keys: ["propriocepção"], code: "propriocepcao", label: "Propriocepção" },
  { keys: ["testes especiais", "testes especiais:"], code: "testes_especiais", label: "Testes especiais" },
  { keys: ["pliometria:"], code: "pliometria", label: "Pliometria" },
  { keys: ["plano terapêutico", "plano terapêutico:"], code: "plano_terapeutico", label: "Plano terapêutico" },
  { keys: ["frequência", "frequência:"], code: "frequencia", label: "Frequência" },
  { keys: ["orientações:"], code: "orientacoes", label: "Orientações" },
];

const FIELD_KEY_TO_SECTION = new Map<string, { code: string; label: string; order: number }>();
FIELD_SECTIONS.forEach((section, order) => {
  for (const key of section.keys) {
    FIELD_KEY_TO_SECTION.set(fold(key), { code: section.code, label: section.label, order });
  }
});

const HTML_ENTITIES: Record<string, string> = {
  "&acirc;": "â",
  "&atilde;": "ã",
  "&ccedil;": "ç",
  "&eacute;": "é",
  "&ecirc;": "ê",
  "&iacute;": "í",
  "&oacute;": "ó",
  "&otilde;": "õ",
  "&uacute;": "ú",
  "&aacute;": "á",
  "&amp;": "&",
};

/** As chaves vieram do HTML do ZenFisio com entidades escapadas. */
function decodeEntities(value: string): string {
  return value.replace(/&[a-z]+;/gi, (e) => HTML_ENTITIES[e.toLowerCase()] ?? e);
}

export interface BuiltEvaluationText {
  text: string;
  unknownFields: string[];
}

/**
 * Reduz o JSON de respostas a um texto canônico.
 *
 * Determinismo é requisito, não conveniência: os offsets gravados em
 * `clinical_extractions` só fazem sentido se este texto puder ser reconstruído
 * byte a byte a partir do `responses` bruto.
 *
 * O blob `Avaliação` entra primeiro e verbatim — assim, nos 271 registros que só
 * têm ele, o texto canônico É o blob e os offsets apontam para o texto que o
 * profissional escreveu, sem deslocamento nenhum.
 */
export function buildEvaluationText(
  fields: Record<string, unknown> | null | undefined,
): BuiltEvaluationText {
  if (!fields) return { text: "", unknownFields: [] };

  const parts: string[] = [];
  const unknownFields: string[] = [];

  const blob = fields["Avaliação"];
  if (typeof blob === "string" && blob.trim().length > 0) parts.push(blob.trim());

  // Seções vindas de chaves próprias, na ordem fixa de FIELD_SECTIONS.
  const bySection = new Map<number, { label: string; values: string[] }>();
  const flags: string[] = [];

  for (const [rawKey, rawValue] of Object.entries(fields)) {
    if (rawKey === "Avaliação") continue;
    const key = fold(rawKey);
    if (IGNORED_FIELDS.has(key)) continue;

    const value = typeof rawValue === "string" ? rawValue.trim() : "";
    if (value.length === 0) continue;

    const mapped = FIELD_KEY_TO_SECTION.get(key);
    if (mapped) {
      const bucket = bySection.get(mapped.order) ?? { label: mapped.label, values: [] };
      bucket.values.push(value);
      bySection.set(mapped.order, bucket);
      continue;
    }

    // Checkbox do ZenFisio: o valor repete a própria chave ("Diabetes":
    // "Diabetes"). É uma comorbidade marcada, e o rótulo é o dado.
    if (fold(decodeEntities(rawKey)) === fold(value)) {
      flags.push(decodeEntities(rawKey));
      continue;
    }

    unknownFields.push(rawKey);
  }

  for (const order of [...bySection.keys()].sort((a, b) => a - b)) {
    const bucket = bySection.get(order)!;
    parts.push(`${bucket.label}:\n${bucket.values.join("\n")}`);
  }

  if (flags.length > 0) {
    // Ordem alfabética para que o texto canônico não dependa da ordem das
    // chaves do JSON (que o Postgres não garante).
    parts.push(`Comorbidades:\n${[...flags].sort((a, b) => a.localeCompare(b, "pt-BR")).join(", ")}`);
  }

  return { text: parts.join("\n"), unknownFields: unknownFields.sort() };
}

// ===========================================================================
// API PRINCIPAL
// ===========================================================================

const EMPTY_LEXICON: ParsedEvolution = parseEvolution("");

function emptyResult(): ParsedEvaluation {
  return {
    lexiconVersion: LEXICON_VERSION,
    text: "",
    sections: [],
    lexicon: EMPTY_LEXICON,
    unknownFields: [],
    hasAnyMatch: false,
  };
}

/** Parseia um texto de avaliação já canônico (útil em testes e no re-parse). */
export function parseEvaluationText(text: string | null | undefined): ParsedEvaluation {
  if (!text || text.trim().length === 0) return emptyResult();

  const sections = parseEvaluationSections(text);
  const lexicon = parseEvolution(text);
  const headerDate = HEADER_DATE_RE.exec(text);

  return {
    lexiconVersion: LEXICON_VERSION,
    text,
    sections,
    lexicon,
    signature: lexicon.signature,
    headerDateText: headerDate?.[1],
    unknownFields: [],
    hasAnyMatch: sections.length > 0,
  };
}

/** Parseia o `responses` bruto de `patient_evaluation_responses`. */
export function parseEvaluation(
  responses: { fields?: Record<string, unknown> | null } | null | undefined,
): ParsedEvaluation {
  const { text, unknownFields } = buildEvaluationText(responses?.fields);
  const parsed = parseEvaluationText(text);
  return { ...parsed, unknownFields };
}

/** Códigos distintos de uma categoria de seção — atalho para agregações. */
export function sectionCodesOf(parsed: ParsedEvaluation, category: EvaluationCategory): string[] {
  return [...new Set(parsed.sections.filter((s) => s.category === category).map((s) => s.code))];
}

/** Corpo da primeira ocorrência de uma seção, ou `undefined` se não existir. */
export function sectionBody(parsed: ParsedEvaluation, code: string): string | undefined {
  return parsed.sections.find((s) => s.code === code)?.body;
}

export type { Extraction };
