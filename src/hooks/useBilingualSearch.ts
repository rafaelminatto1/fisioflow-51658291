import { useState, useEffect } from "react";
import { expandSearchQuery, normalizeForSearch } from "@/lib/utils/bilingualSearch";
import { physioDictionary, PhysioDictionaryEntry } from "@/data/physioDictionary";
import { exercisesApi, protocolsApi } from "@/api/v2/exercises";
import { clinicalTestsApi, clinicalApi } from "@/api/v2/clinical";

/**
 * Reusable hook for bilingual clinical search.
 * 
 * Provides query state, search results, and a formatter for clinical terms.
 * Now includes support for database-backed exercises and clinical tests with aliases.
 */
export function useBilingualSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PhysioDictionaryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const searchItems = async () => {
      setLoading(true);
      try {
        const expandedQueries = expandSearchQuery(query);
        const normalizedQueries = expandedQueries.map(normalizeForSearch);
        
        // 1. Search in local static dictionary (Synchronous)
        const dictionaryResults = physioDictionary.filter(entry => {
          const entryTerms = [
            normalizeForSearch(entry.pt),
            normalizeForSearch(entry.en),
            ...entry.aliases_pt.map(normalizeForSearch),
            ...entry.aliases_en.map(normalizeForSearch)
          ];
          return normalizedQueries.some(nq => entryTerms.some(term => term.includes(nq)));
        });

        // 2-5. Fetch from Database APIs in parallel
        const fetchExercises = async () => {
          try {
            const res = await exercisesApi.list({ q: query, limit: 10 });
            return (res.data || []).map(ex => ({
              id: ex.id,
              pt: ex.name,
              en: (ex.aliases_en || [])[0] || "",
              aliases_pt: ex.aliases_pt || [],
              aliases_en: ex.aliases_en || [],
              category: 'exercise' as const,
              subcategory: ex.subcategory || "",
              description_pt: ex.description || ""
            }));
          } catch (e) {
            console.error("Exercises search failed:", e);
            return [];
          }
        };

        const fetchTests = async () => {
          try {
            const res = await clinicalTestsApi.list(); 
            return (res.data || [])
              .filter(t => {
                const terms = [
                  normalizeForSearch(t.name),
                  ...(t.aliases_pt || []).map(normalizeForSearch),
                  ...(t.aliases_en || []).map(normalizeForSearch)
                ];
                return normalizedQueries.some(nq => terms.some(term => term.includes(nq)));
              })
              .map(t => ({
                id: t.id,
                pt: t.name,
                en: (t.aliases_en || [])[0] || "",
                aliases_pt: t.aliases_pt || [],
                aliases_en: t.aliases_en || [],
                category: 'test' as const,
                description_pt: t.purpose || ""
              }));
          } catch (e) {
            console.error("Tests search failed:", e);
            return [];
          }
        };

        const fetchProtocols = async () => {
          try {
            const res = await protocolsApi.list({ q: query, limit: 10 });
            return (res.data || []).map(p => ({
              id: p.id,
              pt: p.name,
              en: (p.aliases_en || [])[0] || "",
              aliases_pt: p.aliases_pt || [],
              aliases_en: p.aliases_en || [],
              category: 'procedure' as const,
              subcategory: 'Protocolo',
              description_pt: p.description || ""
            }));
          } catch (e) {
            console.error("Protocols search failed:", e);
            return [];
          }
        };

        const fetchTemplates = async () => {
          try {
            const res = await clinicalApi.evolutionTemplates.list({ ativo: true });
            return (res.data || [])
              .filter(t => {
                const terms = [
                  normalizeForSearch(t.name),
                  ...(t.aliases_pt || []).map(normalizeForSearch),
                  ...(t.aliases_en || []).map(normalizeForSearch)
                ];
                return normalizedQueries.some(nq => terms.some(term => term.includes(nq)));
              })
              .map(t => ({
                id: t.id,
                pt: t.name,
                en: (t.aliases_en || [])[0] || "",
                aliases_pt: t.aliases_pt || [],
                aliases_en: t.aliases_en || [],
                category: 'assessment' as const,
                subcategory: 'Modelo de Avaliação',
                description_pt: t.description || ""
              }));
          } catch (e) {
            console.error("Templates search failed:", e);
            return [];
          }
        };

        // Run all DB searches in parallel
        const [exerciseResults, testResults, protocolResults, templateResults] = await Promise.all([
          fetchExercises(),
          fetchTests(),
          fetchProtocols(),
          fetchTemplates()
        ]);

        // 6. Combine and deduplicate by name
        const combined = [
          ...dictionaryResults, 
          ...exerciseResults, 
          ...testResults, 
          ...protocolResults,
          ...templateResults
        ];
        
        const unique = new Map<string, PhysioDictionaryEntry>();
        for (const item of combined) {
          const key = normalizeForSearch(item.pt);
          if (!unique.has(key)) {
            unique.set(key, item);
          }
        }

        setResults(Array.from(unique.values()).slice(0, 15));
      } catch (err) {
        console.error("Clinical search critical error:", err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchItems, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  /**
   * Formats a dictionary entry into a rich-text string (Markdown).
   */
  const formatSelection = (entry: PhysioDictionaryEntry) => {
    const desc = entry.description_pt ? `: ${entry.description_pt}` : "";
    const en = entry.en ? ` (${entry.en})` : "";
    return `**${entry.pt}**${en}${desc}`;
  };

  return {
    query,
    setQuery,
    results,
    loading,
    formatSelection
  };
}
