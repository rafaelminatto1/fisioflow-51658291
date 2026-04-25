/**
 * Normaliza uma string removendo acentos e convertendo para minúsculas.
 * Útil para buscas e comparações de texto.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
