/**
 * Config de testes na raiz do monorepo.
 *
 * Reexporta o config canônico de `apps/web/vitest.config.ts` para que rodar
 * `vitest` a partir da raiz (sem `--config`) já resolva os aliases (`@`,
 * `@fisioflow/*`) e setup files. Sem isto, `npx vitest` na raiz falha com
 * "Cannot find package '@/...'". O config real continua em apps/web.
 */
export { default } from "./apps/web/vitest.config";
