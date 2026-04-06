/**
 * @fisioflow/db — Single source of truth for the Drizzle schema.
 *
 * Re-exports the package-local schema entrypoint.
 * During the migration, the package-local schema still proxies the canonical
 * schema from the monorepo server layer, but consumers stay bound to the
 * package surface instead of its internal relative path.
 */
export * from "./schema";
