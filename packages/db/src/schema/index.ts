/**
 * Package-local schema entrypoint for @fisioflow/db.
 *
 * This keeps consumers importing through the package surface while the
 * canonical schema still lives in the monorepo server layer during migration.
 */
export * from "../../../../src/server/db/schema/index";
