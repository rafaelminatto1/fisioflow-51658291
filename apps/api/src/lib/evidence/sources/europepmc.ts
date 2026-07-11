const EPMC_FULLTEXT = "https://www.ebi.ac.uk/europepmc/webservices/rest";

export async function fetchOpenAccessFullText(pmcId: string | null): Promise<string | null> {
  if (!pmcId) return null;
  const id = pmcId.startsWith("PMC") ? pmcId : `PMC${pmcId}`;
  const res = await fetch(`${EPMC_FULLTEXT}/${id}/fullTextXML`);
  if (!res.ok) return null;
  return await res.text();
}

const XML_ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'" };

/**
 * Converte o JATS XML do Europe PMC em texto plano legível por LLM.
 * Remove referências e metadados de publicação (back matter) — só o corpo interessa ao resumo.
 */
export function xmlToPlainText(xml: string): string {
  return xml
    .replace(/<back>[\s\S]*?<\/back>/g, " ")
    .replace(/<ref-list>[\s\S]*?<\/ref-list>/g, " ")
    .replace(/<\/(p|sec|title|abstract)>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (m) => XML_ENTITIES[m] ?? m)
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

/** Full text OA já convertido em texto plano (null se indisponível). */
export async function fetchOpenAccessPlainText(pmcId: string | null): Promise<string | null> {
  const xml = await fetchOpenAccessFullText(pmcId);
  return xml ? xmlToPlainText(xml) : null;
}
