/**
 * Classificação CIF do objetivo terapêutico.
 *
 * Why: o FYSIOPRIM (N=2.591) mostrou que a classe do objetivo prediz desfecho —
 * atividade/participação teve OR 1,80 para melhora global frente a sintoma, e
 * objetivo não classificável foi associado a pior evolução da dor. Como o
 * objetivo é escrito não é detalhe de formulário: é fator prognóstico.
 *
 * O papel deste módulo é SUGERIR a classe e alertar quando o objetivo ficou só
 * no nível de sintoma — momento em que ainda dá para renegociar com o paciente.
 * A classificação final é sempre do profissional: a heurística abaixo lê palavras,
 * não intenção clínica.
 */

export const ICF_CLASSES = [
  "sintoma",
  "funcao_estrutura",
  "atividade_participacao",
  "nao_classificavel",
] as const;

export type IcfClass = (typeof ICF_CLASSES)[number];

export const ICF_CLASS_LABELS: Record<IcfClass, string> = {
  sintoma: "Sintoma",
  funcao_estrutura: "Função / estrutura",
  atividade_participacao: "Atividade / participação",
  nao_classificavel: "Não classificável",
};

export const ICF_CLASS_HINTS: Record<IcfClass, string> = {
  sintoma: 'Ex.: "reduzir dor lombar"',
  funcao_estrutura: 'Ex.: "ganhar 20° de flexão de ombro"',
  atividade_participacao: 'Ex.: "voltar a jogar futebol aos domingos"',
  nao_classificavel: "Objetivo vago — vale reescrever antes de salvar",
};

/**
 * Termos de atividade/participação observados no próprio corpus da clínica:
 * "gostaria de voltar a jogar futebol", "carrega a filha no colo", "subir escada",
 * "retorno ao esporte", "academia".
 */
const ATIVIDADE_PARTICIPACAO =
  /\b(volta[r]?|retorn[oa]r?|conseguir|poder)\b[^.;\n]{0,40}\b(jogar|corre[r]?|caminhar|treinar|trabalhar|dirigir|dan[çc]ar|nadar|pedalar|subir|descer|carregar|levantar|dormir|sentar|agachar)\b|\b(retorno ao esporte|volta ao esporte|atividades? de vida di[áa]ria|AVDs?|academia|esporte|trabalho|futebol|corrida|escada)\b/i;

const FUNCAO_ESTRUTURA =
  /\b(ADM|amplitude de movimento|for[çc]a|flexibilidade|mobilidade|estabilidade|propriocep[çc][ãa]o|equil[íi]brio|resist[êe]ncia|graus?|°|flex[ãa]o|extens[ãa]o|abdu[çc][ãa]o|adu[çc][ãa]o|rota[çc][ãa]o|hipertrofia|ganho de)\b/i;

const SINTOMA = /\b(dor|d[oó]i|analgesia|desconforto|inflama[çc][ãa]o|edema|incha[çc]o|c[ãa]imbra|parestesia|formigamento)\b/i;

export interface GoalClassification {
  suggested: IcfClass;
  /** Verdadeiro quando o objetivo só descreve sintoma — prognóstico pior. */
  symptomOnly: boolean;
  /** Mensagem para a UI quando vale renegociar o objetivo. */
  advice?: string;
}

/**
 * Sugere a classe CIF de um objetivo escrito em texto livre.
 *
 * Precedência atividade > função > sintoma: um objetivo como "reduzir dor para
 * voltar a correr" é, na prática, de participação — a dor é o obstáculo, não o
 * alvo. Classificá-lo como sintoma perderia justamente o que dá o melhor
 * prognóstico.
 */
export function classifyGoal(description: string | null | undefined): GoalClassification {
  const text = (description ?? "").trim();

  // Objetivo curto demais não carrega informação suficiente para classificar —
  // e "vago" é exatamente a categoria de pior prognóstico.
  if (text.length < 8) {
    return {
      suggested: "nao_classificavel",
      symptomOnly: false,
      advice:
        "Objetivo muito curto para ser avaliado. Objetivos vagos foram associados a pior evolução da dor — descreva o que o paciente quer voltar a fazer.",
    };
  }

  const temAtividade = ATIVIDADE_PARTICIPACAO.test(text);
  const temFuncao = FUNCAO_ESTRUTURA.test(text);
  const temSintoma = SINTOMA.test(text);

  if (temAtividade) return { suggested: "atividade_participacao", symptomOnly: false };
  if (temFuncao) return { suggested: "funcao_estrutura", symptomOnly: false };
  if (temSintoma) {
    return {
      suggested: "sintoma",
      symptomOnly: true,
      advice:
        "Este objetivo descreve apenas o sintoma. Objetivos de atividade/participação (o que o paciente quer voltar a fazer) associaram-se a melhor desfecho — vale acrescentar.",
    };
  }

  return {
    suggested: "nao_classificavel",
    symptomOnly: false,
    advice:
      "Não foi possível reconhecer a classe do objetivo. Objetivos vagos foram associados a pior evolução da dor.",
  };
}

export function isIcfClass(v: unknown): v is IcfClass {
  return typeof v === "string" && (ICF_CLASSES as readonly string[]).includes(v);
}
