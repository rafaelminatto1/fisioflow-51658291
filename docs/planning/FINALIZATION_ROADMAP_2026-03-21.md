# Roadmap Final de Fechamento

Data: 2026-03-21

## Objetivo

Fechar a reorganização do monorepo, estabilizar a toolchain web em Vite 8, reduzir acoplamento web/mobile, cortar bundle inicial e deixar o projeto com uma base mais previsível para manutenção.

## Fase 1. Estrutura e monorepo

Status: concluída

Entregas:
- `apps/api`, `apps/professional-app`, `apps/patient-app` e `apps/web` consolidados.
- raiz do repositório usada como orquestradora do workspace PNPM.
- scripts, CI e hosting ajustados para a topologia nova.

Critérios de aceite:
- workspaces resolvem corretamente.
- build e type-check da web passam.
- apps móveis e API continuam acessíveis por filtro PNPM.

## Fase 2. Toolchain web

Status: concluída

Entregas:
- `vite 8.0.1`
- `@vitejs/plugin-react` alinhado
- `vitest` configurado sem APIs removidas
- análise de bundle integrada ao build

Critérios de aceite:
- `pnpm --filter fisioflow-web type-check` passa.
- `pnpm --filter fisioflow-web build` passa.
- config do Vite/Vitest sem warnings estruturais antigos.

## Fase 3. Boundary de plataforma

Status: concluída

Entregas:
- boundary nativo centralizado em `src/lib/platform/native.ts`
- web sem imports diretos espalhados de `@capacitor/*`
- PWA reduzido a fallback web, sem fluxo duplicado de registro

Critérios de aceite:
- código web usa helpers internos de plataforma.
- bootstrap e service worker convergidos.

## Fase 4. Performance web

Status: concluída no escopo seguro

Entregas:
- wiki/knowledge fora do caminho inicial
- relatórios e viewers PDF carregados sob demanda
- tabs financeiras pesadas lazy-loaded
- exports Excel movidos para `import()` no momento de uso
- MediaPipe de pose em vídeo carregado sob demanda

Resultados observados:
- chunk principal caiu do patamar anterior de ~1.40 MB para ~304 KB
- `Financial` ficou em ~25 KB
- `RelatorioMedicoPage` e `RelatorioConvenioPage` deixaram de carregar `@react-pdf/renderer` no topo
- `LeadImport` e exportadores Excel deixaram de fixar parser/geração no load inicial das telas
- bootstrap do app passou a carregar Sentry, PostHog, App Check e push notifications de forma tardia
- infraestrutura de rota (`SyncManager`, `TourGuide`, `VersionManager`, `PosePreloadManager`, `WebVitalsIndicator`) saiu do shell estático e virou lazy
- providers de rotas autenticadas foram movidos para um shell lazy dedicado (`AuthenticatedAppShell`)
- estilos da agenda saíram do CSS global e viraram `Schedule.css` dedicado (~26.9 KB), carregado com a rota
- estilos de `react-grid-layout` e widgets viraram `grid-layout.css` dedicado (~3.2 KB)
- `ClinicalPostureAnalysis` passou a chunk próprio fora de `ImageAnalysisDashboard`
- o vendor único de PDF foi quebrado em `react-pdf-vendor`, `jspdf-vendor` e `html2canvas-vendor`
- CSS morto de `notion-v3-block` e presets antigos de fonte do editor foi removido do global/editor
- arquivos órfãos `src/App.css` e `src/components/ui/theme/theme.css` foram removidos para reduzir ruído de manutenção

Critérios de aceite:
- build web verde
- principais telas pesadas isoladas em chunks próprios
- exportações e PDFs funcionando por lazy loading

## Fase 5. Manutenção e arquitetura

Status: concluída no escopo de maior retorno

Entregas:
- `src/routes.tsx` reduzido para agregador por domínio
- `src/routes/enterprise.tsx` alinhado ao fluxo real de boards
- componentes de PDF desacoplados em arquivos próprios
- início de modularização progressiva do cliente web por domínio já aproveitado no bundle
- `src/lib/api/workers-client.ts` foi reduzido com extrações de `scheduling`, `imaging`, `events`, `boards`, `tracking`, `communications`, `rehab`, `operations`, `clinicalApi`, `clinicalPublicApi`, `admin`, `feedback` e `billing` para `src/api/v2/*`
- `src/api/v2/index.ts` passou a ser o barrel oficial para consumo do app, e os imports internos deixaram de apontar para `@/lib/api/workers-client`
- `apps/api/src/routes/patients.ts` foi decomposto: os sub-recursos clínicos do paciente saíram para `routes/patients/clinical-details.ts`, com utilitários compartilhados em `routes/patients/shared.ts`
- `apps/api/src/routes/clinical.ts` foi decomposto: os recursos clínicos foram extraídos para `routes/clinical/resources.ts`, com utilitários compartilhados em `routes/clinical/shared.ts`

Critérios de aceite:
- rota principal deixa de ser arquivo monolítico
- composição de rotas por domínio passa no build
- páginas continuam acessíveis com a nova agregação

## Watchlist residual

Estes itens não estão bloqueando o projeto, mas ainda merecem acompanhamento:

- `react-pdf-vendor` ficou em ~1.54 MB.
- `jspdf-vendor` ficou em ~431 KB.
- `html2canvas-vendor` ficou em ~200 KB.
- `dicom-vendor` continua em ~1.47 MB, também isolado em fluxos específicos.
- `computeWorker` continua em ~1.22 MB e foi confirmado como worker especializado do ecossistema Cornerstone/VTK, não carga indevida do shell.
- CSS global caiu para ~436 KB.
- `workers-client.ts` caiu de 2027 para 7 linhas e hoje atua apenas como shim de compatibilidade sobre `@/api/v2`.
- o app web ficou com `0` imports restantes apontando para `@/lib/api/workers-client`.
- `apps/api/src/routes/patients.ts` caiu de 1833 para 702 linhas.
- `apps/api/src/routes/clinical.ts` caiu para 159 linhas, com `routes/clinical/resources.ts` concentrando 1120 linhas de sub-recursos e `routes/clinical/shared.ts` concentrando 111 linhas de helpers.
- `posthog` ficou em chunk próprio de ~176 KB, fora do bundle principal.
- há peers externos ainda defasados para o ecossistema Vite 8 em algumas bibliotecas secundárias.

## Estado final validado

Comandos executados com sucesso:
- `pnpm --filter fisioflow-web type-check`
- `pnpm --filter fisioflow-web build`

## Próximo passo opcional

Se houver uma próxima rodada, ela já não é mais “fechamento de base”. O próximo ciclo seria otimização avançada:
- reduzir CSS global
- revisar chunking de DICOM e worker pesado
- decidir, em uma etapa futura, se `workers-client.ts` pode ser removido de vez ou se vale mantê-lo como alias público estável
- continuar a decomposição das rotas grandes da API, agora começando por `analytics.ts`
- abrir branch separada para upgrades mobile maiores
