/**
 * Section-aware chunking para documentos clínicos (protocolos, wiki, exercícios).
 *
 * Quebra o markdown por seção (headings `##`+), preservando o par
 * "recomendação + nível de evidência" no mesmo chunk, e prefixa cada chunk com
 * um breadcrumb derivado do título do documento para que cada trecho seja
 * auto-suficiente na recuperação. Conteúdo não-PHI.
 */

export interface DocMeta {
  status?: "current" | "deprecated";
  specialty?: string;
  updatedAt?: string;
  sourceType?: "protocol" | "wiki" | "exercise" | "evidence";
  [key: string]: unknown;
}

export interface Chunk {
  /** Texto do chunk, já prefixado com o breadcrumb. */
  text: string;
  /** Heading da seção; vazio para o bloco introdutório (título + campos). */
  heading: string;
  /** Ex.: `> Protocolo Clínico: LCA > Contraindicações`. */
  breadcrumb: string;
  metadata: DocMeta;
}

export interface ChunkOptions {
  /** Acima disso, a seção é subdividida em parágrafos. Default 1600. */
  maxChars?: number;
}

interface Section {
  heading: string;
  body: string[];
}

const HEADING_RE = /^#{2,6}\s+(.*)$/;
const TITLE_RE = /^#\s+(.*)$/;
const DEFAULT_MAX_CHARS = 1600;

/**
 * Empacota parágrafos (blocos separados por linha em branco) em pedaços de até
 * `maxChars`, sem nunca quebrar dentro de um parágrafo — assim o par
 * "recomendação + nível de evidência", que vive no mesmo parágrafo, fica intacto.
 */
function packParagraphs(body: string, maxChars: number): string[] {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p !== "");
  if (paragraphs.length === 0) return [];

  const pieces: string[] = [];
  let buffer = "";
  for (const para of paragraphs) {
    if (buffer && buffer.length + para.length + 2 > maxChars) {
      pieces.push(buffer);
      buffer = para;
    } else {
      buffer = buffer ? `${buffer}\n\n${para}` : para;
    }
  }
  if (buffer) pieces.push(buffer);
  return pieces;
}

export function chunkClinicalDoc(
  markdown: string,
  meta: DocMeta = {},
  opts: ChunkOptions = {},
): Chunk[] {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const lines = markdown.split("\n");

  const titleIdx = lines.findIndex((l) => TITLE_RE.test(l));
  const title = titleIdx >= 0 ? lines[titleIdx].replace(TITLE_RE, "$1").trim() : "";

  const intro: Section = { heading: "", body: [] };
  const sections: Section[] = [];
  let current: Section = intro;

  for (let i = 0; i < lines.length; i++) {
    if (i === titleIdx) continue; // o breadcrumb carrega o título
    const match = HEADING_RE.exec(lines[i]);
    if (match) {
      current = { heading: match[1].trim(), body: [] };
      sections.push(current);
    } else {
      current.body.push(lines[i]);
    }
  }

  const ordered: Section[] = [];
  if (intro.body.some((l) => l.trim() !== "")) ordered.push(intro);
  ordered.push(...sections);

  const chunks: Chunk[] = [];
  for (const sec of ordered) {
    const breadcrumb = sec.heading ? `> ${title} > ${sec.heading}` : `> ${title}`;
    const body = sec.body.join("\n").trim();
    if (!body) {
      chunks.push({ text: breadcrumb, heading: sec.heading, breadcrumb, metadata: { ...meta } });
      continue;
    }
    const pieces = body.length > maxChars ? packParagraphs(body, maxChars) : [body];
    for (const piece of pieces) {
      chunks.push({
        text: `${breadcrumb}\n${piece}`,
        heading: sec.heading,
        breadcrumb,
        metadata: { ...meta },
      });
    }
  }
  return chunks;
}
