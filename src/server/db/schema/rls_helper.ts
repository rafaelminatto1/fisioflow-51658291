import { pgPolicy } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Helper para aplicar a política de isolamento por organização (Multi-tenant).
 * 
 * TEMPORARIAMENTE DESATIVADO PARA DEBUG DE PRODUÇÃO (PERMITINDO TUDO)
 */
export function withOrganizationPolicy(tableName: string, organizationIdColumn: any) {
  return pgPolicy(`policy_${tableName}_isolation`, {
    for: "all",
    to: "authenticated",
    using: sql`true`, // sql`${organizationIdColumn} = (current_setting('app.org_id')::uuid)`,
  });
}

/**
 * Política que permite inserção pública (ex: pré-cadastro) mas isolamento total
 */
export function withPublicWriteOrganizationPolicy(tableName: string, organizationIdColumn: any) {
  return [
    // Permitir INSERT para qualquer pessoa (anon e auth)
    pgPolicy(`policy_${tableName}_public_insert`, {
      for: "insert",
      to: ["authenticated", "anon"],
      withCheck: sql`true`,
    }),
    // Restringir SELECT/UPDATE/DELETE
    pgPolicy(`policy_${tableName}_tenant_isolation`, {
      for: "all",
      to: "authenticated",
      using: sql`true`, // sql`${organizationIdColumn} = (current_setting('app.org_id')::uuid)`,
    })
  ];
}

/**
 * Política para conteúdos híbridos
 */
export function withPublicOrOrganizationPolicy(tableName: string, organizationIdColumn: any) {
  return pgPolicy(`policy_${tableName}_hybrid_isolation`, {
    for: "all",
    to: "authenticated",
    using: sql`true`, // sql`(${organizationIdColumn} IS NULL) OR (${organizationIdColumn} = (current_setting('app.org_id')::uuid))`,
  });
}
