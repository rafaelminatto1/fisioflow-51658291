import { physioDictionary, PhysioTermCategory } from "@/data/physioDictionary";
import { exerciseDictionary } from "@/data/exerciseDictionary";
import { procedureDictionary } from "@/data/procedureDictionary";
import { diagnosticDictionary } from "@/data/diagnosticDictionary";
import { protocolDictionary } from "@/data/protocolDictionary";
import { equipmentDictionary } from "@/data/equipmentDictionary";

/** Combined dictionary: physio terms + extended exercise catalog */
const combinedDictionary = [
  ...physioDictionary,
  ...exerciseDictionary,
  ...procedureDictionary,
  ...diagnosticDictionary,
  ...protocolDictionary,
  ...equipmentDictionary,
];

/**
 * Normalizes a string for search comparison:
 * - Converts to lowercase
 * - Removes diacritics (accents)
 * - Trims extra whitespace
 */
export function normalizeForSearch(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Accent-insensitive search check.
 * Replaces .toLowerCase().includes() pattern for better Portuguese search.
 *
 * @param value The value to search in (e.g., "João")
 * @param query The search query (e.g., "joao")
 * @returns true if value contains query, ignoring case and accents
 *
 * @example
 * accentIncludes("João", "joao") // true
 * accentIncludes("coração", "coracao") // true
 * accentIncludes("fisioterapia", "fisioterapia") // true
 */
export function accentIncludes(value: string, query: string): boolean {
  return normalizeForSearch(value).includes(normalizeForSearch(query));
}

/**
 * Takes a search query and returns an array of equivalent terms (in PT, EN, and aliases).
 *
 * Example: expandSearchQuery("LCA")
 * -> ["lca", "acl", "anterior cruciate ligament", "ligamento cruzado anterior"]
 */
export function expandSearchQuery(query: string): string[] {
  if (!query || query.trim() === "") return [];

  const normalizedQuery = normalizeForSearch(query);
  const equivalentTerms = new Set<string>();

  // Always include the original normalized query
  equivalentTerms.add(normalizedQuery);

  for (const entry of combinedDictionary) {
    const termsInEntry = [
      normalizeForSearch(entry.pt),
      normalizeForSearch(entry.en),
      ...entry.aliases_pt.map(normalizeForSearch),
      ...entry.aliases_en.map(normalizeForSearch),
    ];

    // Check if any term in the entry matches or contains the query
    const isMatch = termsInEntry.some(
      (term) =>
        term === normalizedQuery ||
        term.includes(normalizedQuery) ||
        normalizedQuery.includes(term),
    );

    if (isMatch) {
      termsInEntry.forEach((term) => equivalentTerms.add(term));
    }
  }

  return Array.from(equivalentTerms);
}

/**
 * Generic filter function that applies bilingual search logic to an array of items.
 *
 * @param items Array of items to filter
 * @param query Search string
 * @param fields Array of keys/fields in the item to search against
 * @returns Filtered array
 */
export function bilingualFilter<T>(items: T[], query: string, fields: (keyof T)[]): T[] {
  if (!query || query.trim() === "") return items;

  const expandedQueries = expandSearchQuery(query);

  return items.filter((item) => {
    for (const field of fields) {
      const value = item[field];
      if (!value) continue;

      // Simple string fields
      if (typeof value === "string") {
        const normalizedValue = normalizeForSearch(value);
        if (expandedQueries.some((q) => normalizedValue.includes(q))) {
          return true;
        }
      }
      // Array of strings (like tags or aliases)
      else if (Array.isArray(value)) {
        const normalizedArray = value.map((v) =>
          typeof v === "string" ? normalizeForSearch(v) : "",
        );
        if (normalizedArray.some((val) => expandedQueries.some((q) => val.includes(q)))) {
          return true;
        }
      }
    }
    return false;
  });
}

/**
 * Retrieves specific terms by category
 */
export function getTermsByCategory(category: PhysioTermCategory) {
  return combinedDictionary.filter((entry) => entry.category === category);
}

/**
 * Search the dictionary itself
 */
export function searchDictionary(query: string, categoryFilter?: PhysioTermCategory) {
  let results = combinedDictionary;

  if (categoryFilter) {
    results = results.filter((entry) => entry.category === categoryFilter);
  }

  if (!query || query.trim() === "") {
    return results;
  }

  const expandedQueries = expandSearchQuery(query);

  return results.filter((entry) => {
    const termsInEntry = [
      normalizeForSearch(entry.pt),
      normalizeForSearch(entry.en),
      ...entry.aliases_pt.map(normalizeForSearch),
      ...entry.aliases_en.map(normalizeForSearch),
    ];

    return termsInEntry.some((term) => expandedQueries.includes(term));
  });
}
