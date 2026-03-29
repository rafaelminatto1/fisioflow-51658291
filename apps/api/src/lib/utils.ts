/**
 * Serializa um valor para string JSON de forma segura para colunas JSONB.
 * Garante que nulos retornem null e strings puras sejam devidamente quotadas.
 */
export const jsonSerialize = (value: unknown): string | null => {
  if (value == null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/**
 * Utilitário para garantir que um valor seja tratado como um array.
 */
export const asArray = <T>(val: T | T[]): T[] => {
  if (val == null) return [];
  return Array.isArray(val) ? val : [val];
};
