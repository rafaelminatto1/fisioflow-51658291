# Plano de Implementacao Vite 8

Data: 2026-03-21

> Este documento ficou parcial depois da consolidacao de `apps/web`.
> O plano canonico atual esta em `docs/planning/POST_PHASE1_IMPLEMENTATION_PLAN.md`.

## Estado atual

- Web principal ja roda em `apps/web`.
- `vite` ja foi alinhado para `8.0.1`.
- `vitest.config.ts` ja foi atualizado para a API atual do Vitest 4.
- `build:analyze` agora gera `dist/stats.html` via `rollup-plugin-visualizer`.
- `vite.config.ts` agora usa `resolve.tsconfigPaths`, `server.forwardConsole` por flag e aliases mais enxutos.
- `esbuild` foi alinhado para a faixa exigida pelo Vite 8.

## O que foi aplicado nesta etapa

1. Upgrade seguro do bundler
- `vite` estabilizado em `8.0.1`.
- Remocao do `@vitejs/plugin-react-swc`, que nao era usado.
- Fix de compatibilidade do Vitest 4.

2. Observabilidade de bundle
- `ANALYZE=true pnpm build` passa a gerar `dist/stats.html`.
- O objetivo e atacar primeiro os chunks grandes ja confirmados:
  - `pdf-generator`
  - `dicom-vendor`
  - `excel-vendor`
  - `knowledge`
  - `index`

3. Limpeza de configuracao
- Remocao de aliases mortos no `vite.config.ts`.
- Remocao de `paths` obsoletos no `tsconfig.json`.
- `resolve.tsconfigPaths: true` habilitado para reduzir drift entre Vite e TypeScript.

## Pendencias que ainda nao devem entrar no branch principal sem validacao extra

1. PWA oficial via `vite-plugin-pwa`
- O projeto tem manifest, `public/sw.js`, hooks Workbox e componentes de prompt.
- Hoje existem dois fluxos concorrentes:
  - registro manual em `src/main.tsx`
  - componentes baseados em `virtual:pwa-register/react`
- Antes de ligar `VitePWA(...)`, precisamos escolher uma topologia unica:
  - `injectManifest` reaproveitando um service worker proprio
  - ou migracao total para o fluxo do plugin

2. Storybook com peer range atrasado
- `@storybook/react-vite`
- `@storybook/addon-vitest`
- `@joshwooding/vite-plugin-react-docgen-typescript`
- Hoje o projeto funciona com Vite 8, mas ainda restam warnings de peer range do ecossistema.

3. React Compiler e preset Babel
- `@vitejs/plugin-react` ja foi alinhado para a linha v6.
- O que ainda falta decidir e se o projeto realmente precisa do caminho opt-in de React Compiler com `@rolldown/plugin-babel`.
- Isso deve entrar apenas se houver ganho real e requisito funcional claro.

## Backlog recomendado

### Fase 1

1. Consolidar `apps/web`
- Mover a web da raiz para `apps/web`.
- Deixar a raiz apenas como orquestradora do monorepo.

2. Remover lockfile duplicado
- Apagar `package-lock.json` da raiz.
- Manter `pnpm-lock.yaml` como unica fonte de verdade.

3. Fechar a estrategia de PWA
- Escolher entre `injectManifest` e service worker custom.
- Eliminar o registro manual duplicado.
- Reativar apenas um prompt de update.

### Fase 2

1. Reduzir bundle inicial
- Quebrar lazy imports de PDF, DICOM, Excel e knowledge.
- Separar providers pesados do shell inicial.

2. Atualizar ecossistema de Storybook
- Validar suporte oficial a Vite 8.
- Atualizar os pacotes juntos, nao individualmente.

3. Revisar React Compiler
- Confirmar se o projeto realmente precisa de React Compiler preset.
- Evitar adicionar Babel de volta sem necessidade objetiva.

### Fase 3

1. Auditar plugins do registro do Vite
- `vite-plugin-pwa`
- `vite-bundle-visualizer` ou manter `rollup-plugin-visualizer`
- devtools do Vite apenas se o fluxo do time justificar

2. Medir com baseline
- `pnpm build`
- `pnpm analyze`
- Lighthouse na rota inicial
- comparar antes/depois de cada corte de chunk

## Criterios de aceite

- `pnpm type-check` verde
- `pnpm test:unit` verde
- `pnpm build` verde
- `pnpm analyze` gerando `dist/stats.html`
- sem novos warnings estruturais de configuracao local

## Riscos principais

- PWA: risco de cache inconsistente se misturarmos service worker manual com `vite-plugin-pwa`.
- Storybook: risco baixo de build principal, mas alto de warnings ate alinhar peers.
- Monorepo: mover a web para `apps/web` antes de estabilizar scripts pode quebrar CI e caminhos locais.
