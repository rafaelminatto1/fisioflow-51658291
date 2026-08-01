/**
 * Extração de dados de cadastro a partir da ficha física digitalizada.
 *
 * Why: 997 de 1.022 pacientes não têm telefone, e a origem do problema é que as
 * fichas são de papel — o export do ZenFisio trazia 23 celulares em 1.034
 * pacientes, então não há o que reimportar. Sem telefone, lembretes, follow-up
 * pós-alta, campanhas e a própria fila de confirmação de alta são inexequíveis.
 *
 * DECISÃO DE ARQUITETURA — por que não é AI Search:
 *
 * AI Search resolve "encontrar o documento certo", e o problema aqui é "extrair
 * o campo certo". Indexar ficha de paciente criaria uma segunda cópia de dado
 * pessoal fora do banco, com retenção e exclusão próprias — e apagar um paciente
 * passaria a exigir apagar em dois lugares. O caminho usado é `AI.toMarkdown()`
 * (OCR) seguido de extração determinística sobre o texto resultante, gravando
 * na mesma camada derivada auditável do resto do sistema.
 *
 * REGRA CENTRAL: nada aqui escreve em `patients`. Toda extração entra como
 * `method='ai'` com confiança declarada e espera revisão humana. Telefone lido
 * por OCR e gravado direto no cadastro seria dado não verificado apresentado
 * como fato — um dígito errado vira mensagem para a pessoa errada.
 */

export type IntakeField = "telefone" | "telefone_secundario" | "cpf" | "data_nascimento" | "cep" | "email";

export interface IntakeCandidate {
  field: IntakeField;
  /** Valor normalizado, pronto para gravar após confirmação. */
  value: string;
  /** Trecho literal do OCR que originou o valor. */
  sourceText: string;
  sourceStart: number;
  sourceEnd: number;
  /**
   * 0–1. Reflete a incerteza do OCR, não da regra: os padrões abaixo são
   * determinísticos, mas o texto de origem foi lido por máquina de uma foto.
   */
  confidence: number;
}

/**
 * Confiança base por campo, calibrada pela redundância interna de cada formato.
 *
 * CPF tem dígito verificador — validamos e, quando fecha, a chance de o OCR ter
 * errado e ainda assim passar na validação é baixa. Telefone não tem verificação
 * nenhuma: um dígito trocado continua sendo um telefone válido, e por isso nunca
 * passa de confiança média, por melhor que o OCR pareça.
 */
const CONFIANCA = {
  cpf_valido: 0.95,
  data_nascimento: 0.8,
  cep: 0.8,
  email: 0.75,
  telefone_rotulado: 0.7,
  telefone_solto: 0.5,
} as const;

/** Celular e fixo brasileiros, com ou sem DDD, máscara ou espaços. */
const TELEFONE_RE = /(?:\(?(\d{2})\)?[\s.-]?)?(9?\d{4})[\s.-]?(\d{4})\b/g;

/** Rótulos que precedem um telefone na ficha — elevam a confiança. */
const ROTULO_TELEFONE = /(telefone|tel|fone|celular|cel|whatsapp|zap|contato)\s*:?\s*$/i;

const CPF_RE = /\b(\d{3})[.\s]?(\d{3})[.\s]?(\d{3})[-\s]?(\d{2})\b/g;
const CEP_RE = /\b(\d{5})[-\s]?(\d{3})\b/g;
const DATA_RE = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/g;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/g;

/** Validação do dígito verificador — é o que separa CPF de número qualquer. */
export function cpfValido(digitos: string): boolean {
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;
  for (const [tamanho, posicaoDv] of [[9, 9], [10, 10]] as const) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(digitos[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11 % 10;
    if (resto !== Number(digitos[posicaoDv])) return false;
  }
  return true;
}

function dataPlausivel(dia: number, mes: number, ano: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
  const anoAtual = new Date().getUTCFullYear();
  // 1900 como piso e o ano corrente como teto: data de nascimento no futuro ou
  // de 130 anos atrás é erro de leitura, não paciente longevo.
  return ano >= 1900 && ano <= anoAtual;
}

/**
 * Extrai candidatos a dado cadastral de um texto vindo de OCR.
 *
 * Não decide nada: devolve candidatos com origem e confiança para revisão.
 */
export function extractIntakeFields(ocrText: string | null | undefined): IntakeCandidate[] {
  const texto = ocrText ?? "";
  if (texto.trim().length < 5) return [];

  const candidatos: IntakeCandidate[] = [];
  const push = (
    field: IntakeField,
    value: string,
    m: RegExpMatchArray,
    confidence: number,
  ) => {
    const start = m.index ?? 0;
    candidatos.push({
      field,
      value,
      sourceText: m[0],
      sourceStart: start,
      sourceEnd: start + m[0].length,
      confidence,
    });
  };

  // CPF antes de telefone: 11 dígitos seguidos casariam nos dois padrões, e o
  // dígito verificador desempata com segurança.
  const cpfsEncontrados = new Set<number>();
  for (const m of texto.matchAll(CPF_RE)) {
    const digitos = `${m[1]}${m[2]}${m[3]}${m[4]}`;
    if (!cpfValido(digitos)) continue;
    cpfsEncontrados.add(m.index ?? -1);
    push("cpf", digitos, m, CONFIANCA.cpf_valido);
  }

  const telefonesVistos = new Set<string>();
  for (const m of texto.matchAll(TELEFONE_RE)) {
    const inicio = m.index ?? 0;
    // Não reaproveita dígitos que já foram reconhecidos como CPF válido.
    if ([...cpfsEncontrados].some((c) => c >= 0 && inicio >= c && inicio < c + 14)) continue;

    const ddd = m[1] ?? "";
    const numero = `${m[2]}${m[3]}`;
    // Sem DDD não dá para enviar mensagem; guardamos assim mesmo, porque a
    // recepção completa o DDD na revisão com mais facilidade do que redigitar.
    const valor = ddd ? `${ddd}${numero}` : numero;
    if (telefonesVistos.has(valor)) continue;
    telefonesVistos.add(valor);

    const antes = texto.slice(Math.max(0, inicio - 24), inicio);
    const confianca = ROTULO_TELEFONE.test(antes.trimEnd())
      ? CONFIANCA.telefone_rotulado
      : CONFIANCA.telefone_solto;

    push(
      telefonesVistos.size === 1 ? "telefone" : "telefone_secundario",
      valor,
      m,
      // Sem DDD o número é inutilizável para envio; a confiança cai junto.
      ddd ? confianca : confianca * 0.6,
    );
  }

  for (const m of texto.matchAll(DATA_RE)) {
    const dia = Number(m[1]);
    const mes = Number(m[2]);
    const anoBruto = Number(m[3]);
    const ano = anoBruto < 100 ? (anoBruto > 30 ? 1900 + anoBruto : 2000 + anoBruto) : anoBruto;
    if (!dataPlausivel(dia, mes, ano)) continue;
    const iso = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    push("data_nascimento", iso, m, CONFIANCA.data_nascimento);
  }

  for (const m of texto.matchAll(CEP_RE)) {
    push("cep", `${m[1]}${m[2]}`, m, CONFIANCA.cep);
  }

  for (const m of texto.matchAll(EMAIL_RE)) {
    push("email", m[0].toLowerCase(), m, CONFIANCA.email);
  }

  return candidatos;
}

/**
 * Confiança mínima para o candidato aparecer na fila de revisão.
 *
 * Abaixo disso o ruído supera o ganho: a recepção gasta mais tempo descartando
 * do que digitando, e uma fila que a pessoa aprende a ignorar não serve.
 */
export const CONFIANCA_MINIMA_REVISAO = 0.5;

export function candidatosParaRevisao(candidatos: IntakeCandidate[]): IntakeCandidate[] {
  return candidatos
    .filter((c) => c.confidence >= CONFIANCA_MINIMA_REVISAO)
    .sort((a, b) => b.confidence - a.confidence);
}
