import { TurboQuant, parseTurboSketch } from "@fisioflow/core";

/**
 * Encontra itens similares localmente SEM precisar de conexão (Offline AI).
 * Aproveita os embeddings_sketch de um item pivô "semente" e
 * compara com os sketches de todos os outros itens em cache usando TurboQuant.
 */
export function findSimilarOffline<T>(
  pivotItem: T,
  items: T[],
  extractSketch: (item: T) => string | undefined,
  limit: number = 5,
): T[] {
  const pivotSketchStr = extractSketch(pivotItem);
  if (!pivotSketchStr) return [];

  try {
    const pivotSketch = parseTurboSketch(pivotSketchStr);

    const scoredItems = items.map((item) => {
      if (item === pivotItem) return { item, score: -1 }; // Ignora ele mesmo

      const itemSketchStr = extractSketch(item);
      if (!itemSketchStr) return { item, score: 0 };

      try {
        const itemSketch = parseTurboSketch(itemSketchStr);
        // Usa o algoritmo hiper-rápido pra calcular Similaridade sem floats 64!
        const score = TurboQuant.similarity(pivotSketch, itemSketch);
        return { item, score };
      } catch {
        return { item, score: 0 };
      }
    });

    return scoredItems
      .filter((x) => x.score > 0.3) // threshold mínimo para relevância
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.item);
  } catch (e) {
    console.warn("[findSimilarOffline] Failed to parse pivot sketch", e);
    return [];
  }
}

/**
 * Faz a busca híbrida (texto + similaridade contextual).
 * @param query A string que o usuário digitou.
 * @param items Array completo de opções disponíveis offline.
 * @param textFields Fields que queremos comparar em texto simples.
 * @param limit Limite de resultados a retornar.
 */
export function performTextOfflineSearch<T>(
  query: string,
  items: T[],
  textFields: (keyof T)[],
  limit: number = 20,
): T[] {
  if (!query || query.trim() === "") return items;

  const qMatch = query.toLowerCase().trim();
  const tokens = qMatch.split(/\s+/);

  const scoredItems = items.map((item) => {
    let score = 0;
    for (const field of textFields) {
      const val = String(item[field] || "").toLowerCase();
      if (val.includes(qMatch)) {
        score += 100;
        if (val === qMatch) score += 50;
      } else {
        let tokenMatches = 0;
        for (const token of tokens) {
          if (val.includes(token)) tokenMatches++;
        }
        if (tokenMatches > 0) {
          score += (tokenMatches / tokens.length) * 40;
        }
      }
    }
    return { item, score };
  });

  return scoredItems
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}
