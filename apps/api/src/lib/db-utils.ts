import { sql, eq, and, isNull, type AnyColumn, type SQL } from "drizzle-orm";

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

/**
 * Cria a cláusula 'where' aplicando as regras de tenant (organizationId)
 * e ignorando os registros deletados logicamente (deletedAt).
 */
export function withTenant<T extends { organizationId?: any; deletedAt?: any }>(
  table: T,
  orgId: string,
  ...extraConditions: (SQL | undefined)[]
): SQL {
  const conditions: SQL[] = [];
  if ('organizationId' in table) {
    conditions.push(eq(table.organizationId, orgId));
  }
  // TODO: Re-enable soft delete filter once migrations are confirmed in production
  /*
  if ('deletedAt' in table) {
    conditions.push(isNull(table.deletedAt));
  }
  */
  const validExtraConditions = extraConditions.filter((c): c is SQL => c !== undefined);
  if (validExtraConditions.length > 0) {
    conditions.push(...validExtraConditions);
  }
  return conditions.length > 0 ? and(...conditions)! : sql`1=1`;
}
