import { sql, type AnyColumn } from "drizzle-orm";

/**
 * Helper para realizar buscas insensíveis a acentos no PostgreSQL.
 * Requer a extensão 'unaccent' instalada no banco de dados.
 */
export function unaccent(column: AnyColumn | any) {
  return sql`unaccent(${column})`;
}

/**
 * Helper para criar uma condição de busca insensível a acentos e maiúsculas/minúsculas.
 */
export function searchFilter(column: AnyColumn | any, search: string) {
  const searchPattern = `%${search}%`;
  // Usamos lower(unaccent(coluna)) para garantir compatibilidade total
  return sql`lower(unaccent(${column})) ilike lower(unaccent(${searchPattern}))`;
}
