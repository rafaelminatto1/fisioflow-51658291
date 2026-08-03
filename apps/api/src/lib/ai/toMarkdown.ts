import type { ConversionResult, Env } from "../../types/env";

/**
 * Converte um documento para markdown e devolve só o texto.
 *
 * Why este wrapper: `AI.toMarkdown()` devolve um OBJETO (`{ name, format,
 * data }`), não uma string, e devolve ARRAY quando recebe array. Quem tratava
 * o retorno como string obtinha "[object Object]" — e como a declaração de tipo
 * do projeto prometia `Promise<string>`, o TypeScript não reclamava. Centralizar
 * a normalização impede que o erro volte no próximo ponto de uso.
 *
 * Lança quando a conversão falha, em vez de devolver string vazia: OCR que não
 * leu nada e OCR que leu uma página em branco pedem tratamento diferente.
 */
export async function converterParaMarkdown(
  env: Env,
  arquivo: { name: string; blob: Blob },
): Promise<{ texto: string; tokens?: number; mimetype?: string }> {
  const resultado = await env.AI.toMarkdown({ name: arquivo.name, blob: arquivo.blob });
  const primeiro: ConversionResult = Array.isArray(resultado) ? resultado[0] : resultado;

  if (!primeiro || primeiro.format === "error") {
    throw new Error(primeiro?.error ?? "Conversão para markdown falhou sem detalhe");
  }

  return {
    texto: primeiro.data ?? "",
    tokens: primeiro.tokens,
    mimetype: primeiro.mimetype,
  };
}
