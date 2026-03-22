# Plano de Implementacao Pos-Fase 1

Data: 2026-03-21

## Baseline validado

- A web ja roda por `apps/web`.
- A raiz agora orquestra o workspace via `pnpm`.
- `vite` esta em `8.0.1`.
- `vitest` esta em `4.0.18` e a suite web esta verde.
- `apps/api`, `apps/patient-app`, `apps/professional-app` e web passam em `type-check`.
- O canal principal em celular e nativo (`patient-app` e `professional-app`).
- PWA fica apenas como fallback web no navegador, nao como estrategia principal mobile.

## Progresso aplicado em 2026-03-21

### Plataforma e PWA

- O boundary nativo foi criado em `src/lib/platform/native.ts`.
- O web deixou de importar `@capacitor/*` diretamente em hooks e componentes principais.
- O registro de service worker foi convergido para helpers locais e o fluxo concorrente baseado em `virtual:pwa-register` foi neutralizado.
- `next`, `next-themes`, `vite-plugin-pwa`, `@types/qrcode.react` e `@types/react-window` foram removidos do web.

### Reducao de bundle ja aplicada

- `src/routes.tsx` deixou de importar wiki/knowledge de forma sincrona.
- `src/routes.tsx` foi convertido em agregador por dominio, reutilizando `src/routes/*` e removendo a maior parte da definicao monolitica.
- `src/routes/enterprise.tsx` foi alinhado ao fluxo real de `boards`, mantendo `/tarefas` e `/tarefas-v2` como redirecionamentos para `/boards`.
- Exportacoes de PDF acionadas por clique foram movidas para `import()` sob demanda em:
  - `src/components/clinical/ClinicalTestDetailsModal.tsx`
  - `src/components/reports/ReportGeneratorDialog.tsx`
  - `src/pages/PatientEvolutionReport.tsx`
  - `src/components/eventos/ParticipantesTab.tsx`
  - `src/components/eventos/PrestadoresTab.tsx`
  - `src/components/patients/AIReportGeneratorModal.tsx`
  - `src/pages/patients/PainMapHistoryPage.tsx`
- Tabs pesadas do financeiro passaram para lazy loading em `src/pages/Financial.tsx`.
- `react-pdf` foi encapsulado em `src/components/pdf/ReactPdfViewer.tsx` e removido do topo de `AssetViewer` e `StudyMode`.
- `DoctorReferralReportGenerator` passou a lazy-load de `PDFDownloadLink` e `DoctorReferralPDF`.
- `RelatorioMedicoPage` e `RelatorioConvenioPage` passaram a lazy-load de `PDFDownloadLink` e dos documentos PDF em arquivos dedicados.
- `NFSePage` deixou de carregar `@react-pdf/renderer` no topo.
- `usePDFGenerator` deixou de importar a fabrica de PDFs no topo e passou a carregar `fase2-documentos` sob demanda.
- `PoseOverlay` deixou de importar `@mediapipe/tasks-vision` estaticamente.
- `videoPoseService` passou a carregar `@mediapipe/tasks-vision` sob demanda.
- `TherapistOccupancy`, `AttendanceReport`, `TeamPerformance` e `LeadImport` deixaram de fixar Excel no carregamento inicial das telas.

### Efeito medido no build

- O chunk principal `index` caiu de ~`1.40 MB` para ~`304 KB`.
- `knowledge` continua em ~`363 KB`, mas agora esta isolado do caminho inicial.
- `pdf-generator` segue em ~`2.15 MB`, porem mais deslocado para carga sob demanda.
- `fase2-documentos` passou a chunk proprio de ~`377 KB`.
- `ReactPdfViewer` passou a chunk proprio de ~`447 KB`.
- o bloco antigo de PDF foi separado em `react-pdf-vendor` (~`1.54 MB`), `jspdf-vendor` (~`431 KB`) e `html2canvas-vendor` (~`200 KB`), evitando carregamento conjunto desnecessario.
- O chunk da rota `Financial` caiu para ~`25.6 KB`, com `NFSePage`, `RecibosPage`, `FluxoCaixaPage` e `ContasFinanceirasPage` separados.
- `dicom-vendor` segue em ~`1.47 MB`.
- `excel-vendor` segue em ~`930 KB`.
- `posthog` saiu do shell e virou chunk proprio de ~`176 KB`.
- o CSS da agenda virou `Schedule.css` dedicado (~`26.9 KB`) carregado com a rota.
- `ImageAnalysisDashboard` ficou em ~`8.6 KB` e `ClinicalPostureAnalysis` em chunk proprio de ~`8.7 KB`.
- estilos de `react-grid-layout` e widgets viraram `grid-layout.css` dedicado (~`3.2 KB`).
- CSS morto de `notion-v3-block` e presets antigos de fonte do editor foi removido do global/editor.
- arquivos órfãos `src/App.css` e `src/components/ui/theme/theme.css` foram removidos do repositório.
- CSS global caiu para ~`436 KB`.

### Rodada avancada aplicada depois do baseline inicial

- `src/main.tsx` deixou de importar Sentry, PostHog, App Check e Remote Config no topo.
- `src/App.tsx` passou a lazy-load de `NetworkStatus`, `SyncManager`, `TourGuide`, `VersionManager`, `WebVitalsIndicator` e `PosePreloadManager`.
- o preloading de pose deixou de acontecer para qualquer usuario logado e passou a ser restrito a rotas de analise/computer vision.
- `AuthContextProvider` deixou de prender `posthog-js` no bundle inicial.
- `GlobalErrorBoundary` deixou de importar `@sentry/react` diretamente; a captura passou a usar a instancia registrada em `window`.
- `src/lib/sentry/config.ts` agora expoe a instancia do SDK no `window`, permitindo captura sem reintroduzir dependencia estatica no shell.
- `src/components/app/AuthenticatedAppShell.tsx` passou a concentrar `RealtimeProvider`, `TourProvider`, `GamificationFeedbackProvider` e `MobileSheetProvider` fora das rotas publicas.
- `src/lib/api/workers-client.ts` comecou a ser modularizado de forma progressiva sem quebrar imports legados.
- os dominios `scheduling`, `imaging`, `events`, `boards`, `tracking`, `communications`, `rehab`, `operations`, `clinicalApi`, `clinicalPublicApi`, `admin`, `feedback` e `billing` foram movidos para `src/api/v2/*`, mantendo `workers-client.ts` como fachada de compatibilidade.
- `src/api/v2/index.ts` foi criado como barrel oficial, e os imports internos do app foram redirecionados de `@/lib/api/workers-client` para `@/api/v2`.

## Decisoes de arquitetura que mudam o plano

1. Mobile nativo primeiro
- iOS e Android continuam sendo entregues pelos apps Expo.
- O backlog de PWA sai do caminho critico.

2. PWA como fallback
- Hoje existem fluxos concorrentes de service worker:
  - registro manual em `src/main.tsx`
  - registro manual em `src/components/schedule/BackgroundSync.tsx`
  - hooks/componentes baseados em `virtual:pwa-register/react`
- Isso nao deve ser expandido antes de convergir para uma topologia unica.

3. Monorepo explicito, mas ainda em consolidacao
- `apps/web`, `apps/api`, `apps/patient-app` e `apps/professional-app` ja existem.
- O codigo funcional principal ainda esta majoritariamente em `src`, na raiz do repo.
- A proxima etapa nao e separar repositorios; e reduzir acoplamento e drift dentro do monorepo atual.

## Estado tecnico atual

### Gargalos de performance confirmados

- Chunks grandes no build web:
  - `react-pdf-vendor` ~1.54 MB
  - `jspdf-vendor` ~431 KB
  - `html2canvas-vendor` ~200 KB
  - `dicom-vendor` ~1.47 MB
  - `index` ~304 KB
  - `computeWorker` ~1.22 MB, ja identificado como worker especializado do Cornerstone/VTK
  - `excel-vendor` ~930 KB
  - `knowledge` ~363 KB
- CSS global do app web perto de `436 KB` bruto.

### Gargalos de manutencao confirmados

- Arquivos grandes demais:
  - `src/components/wiki/WikiEditor.tsx` com 2886 linhas
  - `src/pages/relatorios/RelatorioMedicoPage.tsx` continua grande, mas sem a camada de PDF embutida
  - `src/lib/api/workers-client.ts` com 7 linhas, agora apenas como shim de compatibilidade sobre `@/api/v2`
  - `apps/api/src/routes/patients.ts` com 702 linhas apos extração dos sub-recursos clínicos
  - `src/routes.tsx` deixou de ser o gargalo principal apos a agregacao por dominio
- Ainda existe acoplamento estrutural entre web, mobile e servicos compartilhados, mas o boundary inicial de plataforma ja foi criado.

### Drift de dependencias mais importante

1. Capacitor
- O workspace ainda mistura `@capacitor/android` `7.x`, `@capacitor/core` `8.x` e `@capacitor/cli` `2.x`.
- Isso e inconsistente com a documentacao atual do Capacitor 8.

2. Mobile profissional
- `@shopify/react-native-skia` pede `react-native-reanimated >= 3.19.1`.
- O `professional-app` ja foi alinhado durante a reorganizacao, mas continua exigindo vigilancia em upgrades nativos futuros.

3. TipTap
- `@tiptap/extension-mention` esta em `3.20.1`.
- O restante do core/editor continua majoritariamente em `3.20.0`.

4. Dependencias candidatas a limpeza
- `next`, `vite-plugin-pwa`, `@types/qrcode.react` e `@types/react-window` ja foram removidos do web.

## Leitura das docs atuais e impacto no projeto

1. Vite 8
- O projeto ja esta na linha correta do bundler.
- Nao ha necessidade imediata de adicionar novos plugins so porque existem no registry.
- O ganho agora vem de reduzir bundle, nao de empilhar plugin.

2. Storybook com Vite
- A documentacao oficial recomenda centralizar o maximo possivel da configuracao no proprio `vite.config`.
- Isso combina com a estrutura atual de `apps/web` e reduz drift entre app e Storybook.

3. Capacitor 8
- A documentacao oficial pede alinhamento de `core`, `android`, `ios` e `cli`.
- Tambem sobe o baseline de Node para `22+`.
- Isso significa que migrar Capacitor de verdade exige uma decisao de plataforma, nao apenas trocar versoes no `package.json`.

4. Expo SDK 55
- Expo 55 ja existe, mas exige New Architecture e muda o baseline da stack.
- Isso nao deve entrar no branch principal agora.
- Primeiro precisamos estabilizar o monorepo em Expo 54.

5. Vite+ Alpha
- Nao entra no plano de producao neste momento.
- O projeto ainda tem trabalho suficiente em Vite 8 estavel para justificar ficar na linha suportada.

## Decisoes sobre plugins e ferramentas

### Manter

- `@vitejs/plugin-react`
- `rollup-plugin-visualizer`
- Storybook com builder Vite, reaproveitando o config principal

### Adiar

- `vite-plugin-pwa`
- qualquer plugin de devtools extra do ecossistema Vite
- React Compiler opt-in com pipeline adicional

### Nao adotar agora

- `@vitejs/plugin-legacy`
  - so faz sentido se houver requisito formal de navegadores antigos
- `@vitejs/plugin-react-swc`
  - o projeto ja esta em `plugin-react` moderno e nao ha caso claro que exija voltar a SWC
- Vite+ Alpha
  - nao e baseline de producao para este repo neste momento

## Backlog por prioridade

## P0

1. Consolidar o boundary de plataforma
- Substituir imports nativos remanescentes e manter `src/lib/platform/native.ts` como unica porta de entrada para APIs mobile no web.
- Objetivo: impedir regressao de acoplamento web/native.

2. Corrigir o drift de dependencias de plataforma
- Definir se o caminho oficial sera:
  - alinhar Capacitor 8 por completo
  - ou reduzir Capacitor a um papel residual/fallback
- Em paralelo, alinhar `react-native-reanimated` do `professional-app` com `react-native-skia`.

3. Fechar a estrategia de PWA fallback
- Escolher um unico fluxo:
  - `injectManifest` com service worker proprio
  - ou plugin unico
  - ou fallback minimo sem sofisticacao de background sync
- Eliminar registros duplicados de service worker.

## P1

1. Atacar o bundle inicial
- Lazy load agressivo para PDF, DICOM, Excel e knowledge.
- Tirar providers pesados do shell inicial.
- Manter `computeWorker` fora do caminho inicial e só revisitar se houver mudança arquitetural no stack DICOM.

2. Reduzir CSS global
- Auditar o que esta entrando por Tailwind/global CSS.
- Cortar estilos mortos e imports redundantes.

3. Limpar dependencias desnecessarias
- Validar e remover `next` se continuar sem uso real.
- Remover tipos stub desnecessarios.
- Alinhar TipTap para a mesma patch line.

## P2

1. Refatoracao de arquivos grandes
- `src/routes.tsx`
- `src/lib/api/workers-client.ts`
- `src/components/wiki/WikiEditor.tsx`
- rotas grandes do `apps/api`

Status parcial:
- `src/lib/api/workers-client.ts` ja perdeu os blocos de `scheduling`, `imaging`, `events`, `boards`, `tracking`, `clinicalApi` e `clinicalPublicApi`.
- `src/lib/api/workers-client.ts` ja perdeu tambem `communications`, `rehab`, `operations`, `admin`, `feedback` e `billing`, inclusive `crm`, `notifications`, `reports`, `publicBooking`, `telemedicine`, `exercisePlans`, `satisfactionSurveys`, `commissions` e `nfse`.
- O app web ficou com `0` imports restantes apontando para `@/lib/api/workers-client`.
- O proximo corte natural deixa de ser dominio funcional e passa a ser uma decisao de compatibilidade: manter ou aposentar a fachada `workers-client.ts`, que agora e so um shim.
- `apps/api/src/routes/patients.ts` foi quebrado em `patients.ts`, `patients/shared.ts` e `patients/clinical-details.ts`, isolando o CRUD principal dos sub-recursos clínicos.

2. Contratos compartilhados
- Mover tipos e contratos repetidos para `packages`.
- Reduzir mapeamentos manuais espalhados entre web, mobile e API.

3. Ruido operacional
- Reduzir `console.*`, `eslint-disable`, `ts-ignore` e adaptadores temporarios de migracao.

## P3

1. Branch dedicada para Expo 55
- Fazer isso so depois de estabilizar Expo 54 e dependencias nativas.
- Migrar `patient-app` e `professional-app` juntos.

2. Observabilidade de performance
- Consolidar baseline com:
  - `pnpm --filter fisioflow-web build`
  - `pnpm --filter fisioflow-web analyze`
  - Lighthouse em rotas principais

## Ordem recomendada de implementacao

1. Plataforma e dependencias
- consolidacao do Capacitor boundary
- `professional-app` com `reanimated` alinhado ao Skia
- limpeza de dependencias obvias

2. Performance web
- chunks grandes
- shell inicial
- CSS

3. Manutencao
- quebrar arquivos grandes remanescentes
- dividir contratos
- reduzir supressoes

4. PWA fallback
- convergencia do service worker
- simplificacao da estrategia offline

5. Expo 55 em branch

## Criterios de aceite por etapa

### Etapa A

- `pnpm install` sem novos conflitos graves de peer
- `pnpm type-check` verde
- `pnpm build` verde
- decisao documentada sobre o papel real do Capacitor

### Etapa B

- chunk `index` reduzido
- `pdf-generator`, `dicom-vendor`, `excel-vendor` e `knowledge` mais isolados
- CSS global menor que o baseline atual

### Etapa C

- `routes.tsx` dividido
- `workers-client.ts` dividido
- pelo menos duas rotas grandes do `apps/api` decompostas por dominio

### Etapa D

- apenas um fluxo de service worker ativo
- PWA continua funcional como fallback
- sem duplicidade de registro no app

## Riscos e trade-offs

- Alinhar Capacitor cedo demais sem definir o boundary pode espalhar mais acoplamento web/native.
- Migrar Expo 55 cedo demais pode introduzir regressao estrutural em dois apps ao mesmo tempo.
- Mexer em PWA antes de resolver o papel do mobile nativo gera esforco com retorno baixo.
- Refatorar arquivos grandes sem contracts claros pode apenas redistribuir complexidade.

## Proxima execucao recomendada

1. Atacar `computeWorker`, `dicom-vendor`, `excel-vendor` e CSS global.
2. Continuar a decompor rotas grandes da API, agora que `patients.ts` saiu do grupo crítico.
3. Revisar telas grandes que ainda importam `@react-pdf/renderer` diretamente, como `RelatorioMedicoPage`, `RelatorioConvenioPage` e `NFSePage`.
4. Consolidar imports nativos remanescentes no boundary de plataforma.

## Fontes externas consultadas

- Vite plugins: https://vite.dev/plugins/
- Vite config: https://vite.dev/config/
- Vitest migration: https://vitest.dev/guide/migration
- Storybook Vite builder: https://storybook.js.org/docs/builders/vite
- Capacitor 8 update guide: https://capacitorjs.com/docs/updating/8-0
- Capacitor workflow: https://capacitorjs.com/docs/basics/workflow
- Expo SDK 55 changelog: https://expo.dev/changelog/sdk-55
- Vite+ alpha: https://voidzero.dev/posts/announcing-vite-plus-alpha?utm_source=vite&utm_content=top_banner
