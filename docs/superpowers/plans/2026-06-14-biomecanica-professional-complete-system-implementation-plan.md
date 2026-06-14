# Plano De Implementacao: Sistema Completo De Biomecanica

Data: 2026-06-14
Spec: `docs/superpowers/specs/2026-06-14-biomecanica-professional-complete-system-design.md`
Status: pronto para execucao faseada

## Estrategia

Implementar em fatias verticais. Cada fase precisa deixar o app em estado funcional, sem depender de toda a plataforma de IA estar pronta.

Ordem recomendada:

1. Fundacao de dados, tipos e API.
2. Upload/captura com job real.
3. Hub e biblioteca consumindo dados reais.
4. Workbench com anotacoes persistentes.
5. Metricas/comparacao/laudo.
6. Pipeline IA real e analytics avancado.

## Fase 1: Fundacao De Dados E Jobs

Objetivo: criar o contrato duravel para midia, protocolos, jobs e anotacoes, mantendo compatibilidade com `biomechanics_assessments` e `biomechanics_metrics`.

Arquivos provaveis:

- `packages/db/src/schema/biomechanics.ts`
- `packages/db/src/schema/index.ts`
- `apps/api/migrations/<next>_biomechanics_complete_system.sql`
- `apps/api/migrations/<next>_biomechanics_complete_system.down.sql`
- `apps/api/src/routes/biomechanics.ts`
- `apps/api/src/queue.ts`
- `apps/api/src/types/env.ts`
- `apps/professional-app/lib/api/biomechanics.ts`

Tarefas:

- [ ] Adicionar tabelas: `biomechanics_media`, `biomechanics_jobs`, `biomechanics_protocols`, `biomechanics_frames`, `biomechanics_events`, `biomechanics_annotations`, `biomechanics_review_actions`.
- [ ] Adicionar colunas em `biomechanics_assessments`: `protocol_id`, `primary_media_id`, `job_id`, `quality_score`, `capture_context`, `validated_by`, `validated_at`, `algorithm_version`, `report_hash`, `signed_at`, `signature_metadata`.
- [ ] Adicionar colunas em `biomechanics_metrics`: `side`, `phase`, `view`, `confidence`, `source`, `normal_range`, `severity`, `algorithm_version`.
- [ ] Aplicar RLS por `organization_id` nas novas tabelas.
- [ ] Criar tipos TypeScript compartilhados para media, job, protocolo, frame, evento e anotacao.
- [ ] Criar seed inicial de protocolos biomecanicos.
- [ ] Criar task de fila `PROCESS_BIOMECHANICS_MEDIA` com processamento simulado deterministico.
- [ ] Criar endpoints de dashboard, protocolos, captura, upload complete, process, job e workbench.

Aceite:

- [ ] Um assessment pode ser criado com protocolo.
- [ ] Uma media pode ser registrada e associada ao assessment.
- [ ] Um job pode ser enfileirado, processado e movido para `needs_review`.
- [ ] Metricas normalizadas de exemplo aparecem em `biomechanics_metrics`.
- [ ] Usuario de outra organizacao nao acessa registros.

Verificacao:

- `pnpm --filter @fisioflow/api test`
- `pnpm type-check`
- Teste unitario de normalizacao/status de job.

## Fase 2: Captura Guiada E Biblioteca Completa

Objetivo: substituir dados estaticos das telas por protocolos reais e melhorar a criacao de captura.

Arquivos provaveis:

- `apps/professional-app/app/biomecanica/index.tsx`
- `apps/professional-app/app/biomecanica/tests.tsx`
- `apps/professional-app/app/biomecanica/capture.tsx`
- `apps/professional-app/lib/api/biomechanics.ts`
- `apps/professional-app/types/biomechanics.ts`
- `apps/professional-app/components/biomecanica/*`

Tarefas:

- [ ] Carregar protocolos via API em `/biomecanica/tests`.
- [ ] Adicionar filtros por categoria, view e metricas.
- [ ] Criar fluxo de nova captura com paciente, protocolo, view e tentativa.
- [ ] Registrar checklist de qualidade e contexto de captura.
- [ ] Integrar upload complete com criacao de `biomechanics_media`.
- [ ] Exibir job/status apos upload.
- [ ] Atualizar hub com dashboard real da API.

Aceite:

- [ ] O usuario inicia captura a partir de protocolo real.
- [ ] O app registra protocolo, view e tentativa.
- [ ] O hub mostra jobs reais e estado atualizado.
- [ ] Falhas de upload/processamento aparecem com acao de tentar novamente.

Verificacao:

- `pnpm --filter professional-app type-check`
- Fluxo manual no app: protocolo -> captura/upload -> job -> hub.

## Fase 3: Workbench Kinovea-Like

Objetivo: tornar a tela de analise uma bancada tecnica com medidas e anotacoes persistentes.

Arquivos provaveis:

- `apps/professional-app/app/biomecanica/analysis.tsx`
- `apps/professional-app/components/biomecanica/AnalysisWorkbench.tsx`
- `apps/professional-app/components/biomecanica/MeasurementLayer.tsx`
- `apps/professional-app/components/biomecanica/TimelineEvents.tsx`
- `apps/professional-app/lib/api/biomechanics.ts`
- `apps/api/src/routes/biomechanics.ts`

Tarefas:

- [ ] Extrair workbench em componentes menores.
- [ ] Persistir anotacoes: linhas, setas, texto, angulo, distancia e pontos de goniometro.
- [ ] Carregar frames/eventos/metricas do endpoint `workbench`.
- [ ] Permitir editar metricas com `source=manual`.
- [ ] Adicionar validacao clinica: notas, conclusoes, status `validated`.
- [ ] Adicionar timeline com eventos e marcadores.
- [ ] Adicionar modo side-by-side/ghost usando avaliacoes anteriores quando disponivel.

Aceite:

- [ ] Anotacoes sobrevivem ao fechar/abrir a tela.
- [ ] Medida manual aparece no painel de metricas.
- [ ] Validacao muda assessment para `validated`.
- [ ] Comparacao abre a partir da analise validada.

Verificacao:

- Testes de API para anotacoes e validacao.
- Teste manual: criar anotacao -> reabrir -> validar.

## Fase 4: Metricas E Comparacao Longitudinal

Objetivo: padronizar calculos por dominio e tornar comparacoes reais.

Arquivos provaveis:

- `apps/api/src/lib/biomechanics/metricDefinitions.ts`
- `apps/api/src/lib/biomechanics/metricExtraction.ts`
- `apps/api/src/routes/biomechanics.ts`
- `apps/professional-app/app/biomecanica/comparison.tsx`
- `apps/professional-app/app/biomecanica/report.tsx`

Tarefas:

- [ ] Criar catalogo de metricas por dominio.
- [ ] Implementar normalizacao de lado, fase, unidade, severidade e lowerIsBetter.
- [ ] Reescrever comparacao para usar metricas normalizadas.
- [ ] Adicionar timeline do paciente por protocolo.
- [ ] Exibir deltas, tendencia e confidence score.
- [ ] Preparar payload de laudo com frames, anotacoes e metricas.

Aceite:

- [ ] Duas avaliacoes do mesmo protocolo geram comparacao consistente.
- [ ] Metricas com unidade e direcao correta aparecem no app e no laudo.
- [ ] Comparacao funciona mesmo com metricas novas/ausentes.

Verificacao:

- Unit tests de delta, severidade e missing metrics.
- Teste manual com duas avaliacoes do mesmo paciente.

## Fase 5: Laudo, Assinatura E Prescricao

Objetivo: completar fechamento clinico e envio ao paciente.

Arquivos provaveis:

- `apps/api/src/routes/biomechanics.ts`
- `apps/api/src/routes/clinical/auto-prescribe.ts`
- `apps/professional-app/app/biomecanica/report.tsx`
- `apps/professional-app/lib/services/cloudPdfService.ts`

Tarefas:

- [ ] Incluir anotacoes e frames-chave no HTML/PDF.
- [ ] Versionar PDF por hash de conteudo clinico.
- [ ] Invalidar PDF quando metricas, anotacoes ou conclusao mudarem.
- [ ] Diferenciar IA preliminar de validacao profissional.
- [ ] Criar sugestoes de prescricao a partir de metricas/protocolo.
- [ ] Registrar aceite, edicao ou rejeicao da sugestao.

Aceite:

- [ ] Avaliacao validada gera PDF com metricas, comparacao e anotacoes.
- [ ] Assinatura/verificacao retornam integridade.
- [ ] Prescricao sugerida pode ser aceita ou editada.

Verificacao:

- Testes de hash/PDF/signature.
- Teste manual de gerar, compartilhar e verificar.

## Fase 6: Pipeline IA Real E Analytics

Objetivo: evoluir do processamento simulado para analise real e observabilidade do produto.

Arquivos provaveis:

- `apps/api/src/workflows/biomechanicsAnalysis.ts`
- `apps/api/src/lib/biomechanics/poseProvider.ts`
- `apps/api/src/lib/biomechanics/frameExtraction.ts`
- `apps/api/src/lib/biomechanics/qualityScoring.ts`
- `apps/api/src/index.ts`
- `apps/api/wrangler.toml`

Tarefas:

- [ ] Criar workflow `biomechanics-analysis`.
- [ ] Adicionar binding `WORKFLOW_BIOMECHANICS_ANALYSIS`.
- [ ] Implementar contrato `PoseProvider` com provider inicial e fallback manual.
- [ ] Guardar landmarks completos em R2 quando volume for alto.
- [ ] Persistir frames/eventos resumidos no banco.
- [ ] Enviar eventos para Analytics Engine.
- [ ] Adicionar reprocessamento com `algorithm_version`.

Aceite:

- [ ] Job real executa pipeline duravel e reporta progresso.
- [ ] Falha de etapa fica visivel e reprocessavel.
- [ ] Quality score e confidence aparecem no workbench/laudo.
- [ ] Eventos operacionais aparecem na camada de analytics.

Verificacao:

- Teste de workflow com mock provider.
- Smoke em staging com video curto.

## Ordem De Commits Recomendada

1. `db: add biomechanics processing schema`
2. `api: add biomechanics protocols and jobs`
3. `mobile: load biomechanics dashboard and protocols`
4. `mobile: add guided capture job flow`
5. `mobile: persist biomechanics workbench annotations`
6. `api: normalize biomechanics metrics and comparisons`
7. `api: enrich biomechanics report and prescription flow`
8. `infra: add biomechanics analysis workflow`

## Primeiro Slice Executavel

Comecar pela Fase 1 com escopo reduzido:

- Migrations + schema Drizzle.
- Endpoints `GET /protocols`, `POST /captures`, `GET /:id/job`, `GET /:id/workbench`.
- Queue `PROCESS_BIOMECHANICS_MEDIA` simulada.
- Tipos mobile atualizados.

Resultado esperado: o app ainda pode manter a UI atual, mas passa a ter backend real para a proxima fase.

## Cuidados

- Nao alterar arquivos de scripts arquivados ou mudancas pendentes nao relacionadas.
- Manter compatibilidade com avaliacoes biomecanicas existentes.
- Evitar bloquear o fluxo atual de laudo/comparacao durante a migracao.
- Tratar midia como dado sensivel; usar URL assinada quando disponivel.
- Toda nova tabela multi-tenant precisa de `organization_id` e RLS.
