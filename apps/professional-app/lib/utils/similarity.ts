function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[m][n];
}

export function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);

  if (norm1 === norm2) return 1;
  if (norm1.length === 0 || norm2.length === 0) return 0;

  const distance = levenshteinDistance(norm1, norm2);
  const maxLen = Math.max(norm1.length, norm2.length);
  return 1 - distance / maxLen;
}

export function findSimilarItems(
  query: string,
  items: { label: string; value: string }[],
  threshold: number = 0.7,
): { label: string; value: string; similarity: number }[] {
  return items
    .map((item) => ({
      ...item,
      similarity: calculateSimilarity(query, item.label),
    }))
    .filter((item) => item.similarity >= threshold && item.similarity < 1)
    .sort((a, b) => b.similarity - a.similarity);
}

export function findExactNormalizedMatch(
  query: string,
  items: { label: string; value: string }[],
): { label: string; value: string } | null {
  const normalizedQuery = normalizeText(query);
  return items.find((item) => normalizeText(item.label) === normalizedQuery) || null;
}

export function toTitleCase(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
