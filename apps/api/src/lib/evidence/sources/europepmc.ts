const EPMC_FULLTEXT = "https://www.ebi.ac.uk/europepmc/webservices/rest";

export async function fetchOpenAccessFullText(pmcId: string | null): Promise<string | null> {
  if (!pmcId) return null;
  const id = pmcId.startsWith("PMC") ? pmcId : `PMC${pmcId}`;
  const res = await fetch(`${EPMC_FULLTEXT}/${id}/fullTextXML`);
  if (!res.ok) return null;
  return await res.text();
}
