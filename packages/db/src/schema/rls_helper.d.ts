/**
 * Helper para aplicar a política de isolamento por organização (Multi-tenant).
 *
 * Esta política utiliza o parâmetro de sessão 'app.org_id' definido via SQL
 * para garantir que um tenant nunca veja dados de outro.
 */
export declare function withOrganizationPolicy(tableName: string, organizationIdColumn: any): import("drizzle-orm/pg-core").PgPolicy;
/**
 * Política que permite inserção pública (ex: pré-cadastro) mas isolamento total
 * na leitura e alteração para usuários autenticados daquela organização.
 */
export declare function withPublicWriteOrganizationPolicy(tableName: string, organizationIdColumn: any): import("drizzle-orm/pg-core").PgPolicy[];
/**
 * Política para conteúdos híbridos (Públicos globais ou Privados de organização).
 * Ex: Wiki, Dicionário.
 */
export declare function withPublicOrOrganizationPolicy(tableName: string, organizationIdColumn: any): import("drizzle-orm/pg-core").PgPolicy[];
