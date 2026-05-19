export interface PubMedArticle {
  id: string;
  title: string;
  url: string;
}

export class PubMedClient {
  private static readonly BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

  async searchEvidence(term: string, limit: number = 3): Promise<PubMedArticle[]> {
    try {
      // 1. ESearch: Buscar IDs
      const searchUrl = `${PubMedClient.BASE_URL}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
        `${term} AND physical therapy AND exercise`
      )}&retmode=json&retmax=${limit}`;

      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) return [];

      const searchData = await searchRes.json();
      const ids: string[] = searchData?.esearchresult?.idlist || [];

      if (ids.length === 0) return [];

      // 2. ESummary: Obter Títulos
      const summaryUrl = `${PubMedClient.BASE_URL}/esummary.fcgi?db=pubmed&id=${ids.join(
        ","
      )}&retmode=json`;

      const summaryRes = await fetch(summaryUrl);
      if (!summaryRes.ok) return [];

      const summaryData = await summaryRes.json();
      const results = summaryData?.result || {};

      const articles: PubMedArticle[] = ids.map((id) => ({
        id,
        title: results[id]?.title || "Artigo sem título",
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      }));

      return articles;
    } catch (error) {
      console.error("Erro ao buscar no PubMed:", error);
      return [];
    }
  }
}
