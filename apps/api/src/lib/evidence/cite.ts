export function toVancouver(
  title: string,
  authors: string | string[] | null,
  journal: string | null,
  year: number | null,
  volume: string | null,
  pages: string | null,
  doi: string | null,
): string {
  const authorStr = typeof authors === "string" ? authors : Array.isArray(authors) ? authors.join(", ") : "";
  const parts = [authorStr ? `${authorStr}.` : "", title ? `${title}.` : ""];
  if (journal) parts.push(`${journal}.`);
  if (year) parts.push(`${year}`);
  if (volume) parts.push(`${volume}`);
  if (pages) parts.push(`(${pages})`);
  if (doi) parts.push(`doi:${doi}`);
  return parts.filter(Boolean).join(" ");
}
