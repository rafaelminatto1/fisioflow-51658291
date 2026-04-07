import { useState, useEffect } from "react";
import { expandSearchQuery, normalizeForSearch } from "@/lib/utils/bilingualSearch";
import { physioDictionary, PhysioDictionaryEntry } from "@/data/physioDictionary";

/**
 * Reusable hook for bilingual clinical search.
 * 
 * Provides query state, search results, and a formatter for clinical terms.
 */
export function useBilingualSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PhysioDictionaryEntry[]>([]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const expandedQueries = expandSearchQuery(query);
    const normalizedQueries = expandedQueries.map(normalizeForSearch);
    
    // Search in local dictionary array
    const matchedEntries = physioDictionary.filter(entry => {
      const entryTerms = [
        normalizeForSearch(entry.pt),
        normalizeForSearch(entry.en),
        ...(entry.description_pt ? [normalizeForSearch(entry.description_pt)] : []),
        ...(entry.description_en ? [normalizeForSearch(entry.description_en)] : []),
        ...entry.aliases_pt.map(normalizeForSearch),
        ...entry.aliases_en.map(normalizeForSearch)
      ];

      // Check if any of the expanded queries are in the entry terms
      return normalizedQueries.some(nq => {
        return entryTerms.some(term => term.includes(nq) || nq.includes(term));
      });
    });

    setResults(matchedEntries.slice(0, 10)); // Limit to 10 results
  }, [query]);

  /**
   * Formats a dictionary entry into a rich-text string (Markdown).
   */
  const formatSelection = (entry: PhysioDictionaryEntry) => {
    const desc = entry.description_pt ? `: ${entry.description_pt}` : "";
    return `**${entry.pt}** (${entry.en})${desc}`;
  };

  return {
    query,
    setQuery,
    results,
    formatSelection
  };
}
