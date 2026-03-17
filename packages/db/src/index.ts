/**
 * @fisioflow/db — Single source of truth for the Drizzle schema.
 *
 * Re-exports the canonical schema from src/server/db/schema.
 * Both the frontend (Vite) and the Workers API import from here,
 * eliminating fragile relative paths like ../../../src/server/db/schema.
 */
export * from '../../../src/server/db/schema/index';
