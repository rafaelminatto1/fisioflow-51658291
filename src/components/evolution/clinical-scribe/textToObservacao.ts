const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Converte texto ditado/transcrito em parágrafos HTML para o editor de
 * observação clínica (modelo único da evolução — SOAP foi removido).
 * Quebras de linha duplas viram parágrafos separados.
 */
export function textToObservacaoHtml(text: string): string {
  return (text || "")
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `<p>${escapeHtml(t)}</p>`)
    .join("");
}
