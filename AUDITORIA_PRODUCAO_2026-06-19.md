# Auditoria de Produção — 2026-06-19

URL auditada: `https://www.moocafisio.com.br`  
API observada: `https://fisioflow-api.rafalegollas.workers.dev`  
Método: Chromium via Playwright, com login real e captura de `console`, `response` e `requestfailed`  
Evidência bruta: [audit-results.json](/home/rafael/Documents/fisioflow/fisioflow-51658291/tmp/prod-audit-2026-06-19/audit-results.json)

## Status Após Implementação Local

Após a auditoria, os seguintes itens `P0` foram corrigidos no código local e passaram em `type-check` de frontend e API:

- validação de datas no relatório médico do perfil do paciente
- autenticação das páginas `IA Studio` e `AI Analytics Hub`
- montagem/implementação das rotas `/api/analytics/bi`, `/api/insights/top-exercises`, `/api/insights/pain-map` e rotas de `patient analytics`
- remoção de DDL em runtime da rota `/api/notification-preferences`
- correção da query de `/api/clinic-metrics/overdue-payments` para o schema atual de `patients`

Essas correções ainda não foram validadas em produção nesta auditoria porque dependem de deploy do Worker/API e novo teste ponta a ponta no ambiente publicado.

## Resumo Executivo

Foram auditadas todas as páginas principais da sidebar visíveis no ambiente autenticado: `Agenda`, `Pacientes`, `WhatsApp`, `CRM WhatsApp`, `Avaliação Inicial`, `Evolução Clínica`, `Exercícios`, `Busca IA (Exercícios)`, `Curadoria de Exercícios`, `Protocolos`, `Testes Clínicos`, `Avaliações`, `Central de Inteligência AI`, `Copiloto Clínico AI`, `Base de Conhecimento AI`, `Briefing do Dia`, `Automações`, `Monitor de Atividades`, `Eventos`, `Boards`, `Cadastros`, `Wiki Clínica`, `Estoque`, `Telemedicina`, `Comunicação`, `Configurações` e `Configurações da Agenda`.

No perfil do paciente, o produto atual não expõe as abas com os nomes solicitados (`Avaliação`, `Tratamento`, `Assistente`, `Escalas`, `Mídia`, `Configurações`). O que existe hoje é `Visão Geral`, `Evolução`, `Linha do Tempo`, `Analytics & IA`, `Dados Pessoais`, `Histórico Clínico`, `Biomecânica`, `Financeiro`, `Gamificação`, `Arquivos`, `Tarefas` e `Evidência`. A auditoria conseguiu entrar no perfil, mas a aba de `Analytics & IA` quebra com erro de runtime e desestabiliza a navegação das abas seguintes.

Contagem de problemas distintos encontrados:

| Severidade | Qtde | Itens |
| --- | ---: | --- |
| `P0` | 5 | quebra do perfil do paciente, rotas 404 de analytics/insights, 401 em endpoints AI, 500 em `overdue-payments`, 500 em `notification-preferences` |
| `P1` | 2 | assets de exercícios faltando no R2, inconsistência entre abas reais do prontuário e fluxo esperado |
| `P2` | 1 | `requestfailed net::ERR_ABORTED` em chamadas abortadas por navegação |

## Tabela de Erros

| Sev. | Página/Aba | Recurso | Status | Componente/arquivo fonte | Causa raiz | Arquivo a modificar | Mudança necessária |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `P0` | `Paciente > Analytics & IA` | `RangeError: Invalid time value` | runtime | [DoctorReferralReportGenerator.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/reports/DoctorReferralReportGenerator.tsx:63) via [PatientAnalyticsTab.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/patient/PatientAnalyticsTab.tsx:73) | o componente faz `format(new Date(...))` sem validar `birthDate` e `recordDate`; um valor inválido derruba a árvore React e o `ErrorBoundary` do perfil | [DoctorReferralReportGenerator.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/reports/DoctorReferralReportGenerator.tsx:66) | validar datas com `isValid`, aplicar fallback textual e ignorar registros com `recordDate` inválido antes de montar `reportData` |
| `P0` | `Exercícios > Analytics` | `/api/insights/top-exercises?limit=5` | `404` | [insights.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/api/v2/insights.ts:101) | o frontend chama uma rota que não está exposta no `analyticsRoutes` montado em produção | [analytics.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/analytics.ts:11) | implementar/montar `GET /top-exercises` no `analyticsRoutes` ou alterar o frontend para o endpoint real existente |
| `P0` | `Exercícios > Analytics` | `/api/insights/pain-map?limit=5` | `404` | [insights.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/api/v2/insights.ts:105) | mesma classe de problema: rota esperada pelo frontend não está montada no backend atual | [analytics.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/analytics.ts:11) | implementar/montar `GET /pain-map` no `analyticsRoutes` ou repoint do frontend |
| `P0` | `Paciente > Analytics & IA` | `/api/insights/patient-lifecycle-events/:patientId` | `404` | [insights.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/api/v2/insights.ts:128), backend em [analytics/patient.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/analytics/patient.ts:332) | a implementação existe em arquivo separado, mas não está montada pelo agregador [analytics.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/analytics.ts:11) | [analytics.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/analytics.ts:11) | importar e montar as rotas de `analytics/patient.ts` sob `/api/analytics` e `/api/insights` |
| `P0` | `Central de Inteligência AI > Analytics` | `/api/analytics/bi?months=6` | `404` | [FinancialAnalytics.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/analytics/FinancialAnalytics.tsx:147), [AdvancedAnalytics.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/AdvancedAnalytics.tsx:84) | o frontend depende de `GET /api/analytics/bi`, mas o backend montado em [analytics.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/analytics.ts:11) não expõe `/bi` | [analytics.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/analytics.ts:11) | criar `GET /bi` com o contrato esperado pelo frontend ou trocar o consumo para uma rota existente |
| `P0` | `Central de Inteligência AI > Studio IA` | `/api/ai/usage/weekly` | `401` | [IAStudio.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/IAStudio.tsx:35), backend protegido em [ai.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/ai.ts:16) | a tela usa `fetch()` cru sem `Authorization`; a rota está atrás de `requireAuth` global | [IAStudio.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/IAStudio.tsx:38) | trocar para `request()` de [base.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/api/v2/base.ts:64) ou anexar JWT via `getNeonAccessToken()` |
| `P0` | `Central de Inteligência AI > Analytics` | `/api/ai-insights/analytics` | `401` | [AIHub.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/AIHub.tsx:35), backend protegido em [ai-insights.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/ai-insights.ts:9) | a página monta header com `localStorage.getItem("token")`, mas o app usa Neon Auth/JWT dinâmico; o token manual não está válido no fluxo atual | [AIHub.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/AIHub.tsx:35) | substituir `fetch` manual por `request()` ou usar `getNeonAccessToken()`; remover dependência do `localStorage` |
| `P0` | `Central de Inteligência AI` e `Fisio Brain` | `/api/clinic-metrics/overdue-payments` | `500` | widget [OverduePaymentsAlert.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/dashboard/OverduePaymentsAlert.tsx:27), rota [clinicMetrics.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/clinicMetrics.ts:624) | o endpoint ainda falha em produção apesar do código local já apontar para `contas_financeiras`; isso indica descompasso entre código e deploy, ou schema real divergente do assumido pela rota | [clinicMetrics.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/clinicMetrics.ts:624) | validar a query contra o schema real, cobrir com teste backend e garantir deploy do Worker que contenha a versão corrigida |
| `P0` | `Configurações > Notificações` | `/api/notification-preferences` | `500` | hook [useNotificationPreferences.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/hooks/useNotificationPreferences.ts:21), rota [notificationPreferences.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/notificationPreferences.ts:17) | a rota tenta fazer `CREATE TABLE`, `ALTER TABLE` e `CREATE INDEX` em runtime no primeiro `GET`; isso é frágil em produção e depende de permissão DDL. Há também migração RLS com nome de policy inválido em [0057_rls_complete.sql](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/migrations/0057_rls_complete.sql:488) | [notificationPreferences.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/notificationPreferences.ts:17), [0057_rls_complete.sql](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/migrations/0057_rls_complete.sql:488) | mover bootstrap de schema para migration explícita, corrigir a policy/migration e deixar a rota apenas ler/gravar dados |
| `P1` | `Exercícios` e `Exercícios > Mídias` | `https://media.moocafisio.com.br/exercises/illustrations/crunch.png` | `404` | renderização de mídia usa `image_url` via [imageUtils.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/lib/imageUtils.ts:49) | o bucket público não tem o objeto solicitado, enquanto o repositório local já aponta para nomes normalizados como `abdominal-crunch.avif` em [exerciseDictionary.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/data/exerciseDictionary.ts:2670) | [imageUtils.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/lib/imageUtils.ts:49) e pipeline de sincronização de exercícios | normalizar aliases antigos de imagem, fazer backfill de `image_url`/`thumbnail_url` e/ou publicar os arquivos faltantes no R2 |
| `P1` | `Exercícios` e `Exercícios > Mídias` | `https://media.moocafisio.com.br/exercises/illustrations/leg-raise-lateral.png` | `404` | mesmo fluxo do item anterior | slug legado ainda referenciado por dados de produção; arquivo não existe no bucket auditado | mesmo conjunto do item anterior | mesmo tratamento: backfill/alias/upload |
| `P1` | `Exercícios` e `Exercícios > Mídias` | `https://media.moocafisio.com.br/exercises/illustrations/abducao-de-quadril-em-pe.avif` | `404` | mesmo fluxo do item anterior | apesar de existir localmente em `public/exercises/illustrations`, o objeto não está servido em `media.moocafisio.com.br`; problema de publicação/sincronização do bucket | pipeline de mídia / publicação de exercícios | republicar o asset para R2 e validar consistência entre catálogo local e bucket público |
| `P2` | várias páginas | `requestfailed ... net::ERR_ABORTED` em `/api/appointments?...` e `cdn-cgi/rum` | sem status | chamadas canceladas por troca rápida de rota | ruído típico de navegação durante auditoria automatizada; não se comportou como erro funcional isolado | não prioritário | manter fora do backlog de correção, apenas monitorar se aparecer em navegação manual |

## Plano de Correção Priorizado

### `P0` imediato

1. Corrigir a quebra do perfil do paciente.
   Arquivo: [DoctorReferralReportGenerator.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/reports/DoctorReferralReportGenerator.tsx:63)
   Mudança: validar datas antes de `format()`, filtrar `recordDate` inválido e garantir fallback seguro em `birthDate`, `lastSession` e `evolution`.

2. Reconciliar frontend e backend de analytics/insights.
   Arquivos: [src/api/v2/insights.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/api/v2/insights.ts:101), [analytics.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/analytics.ts:11), [analytics/patient.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/analytics/patient.ts:332)
   Mudança: montar no backend os paths hoje consumidos pelo frontend (`/top-exercises`, `/pain-map`, `/patient-lifecycle-events`, `/bi`) ou alterar o frontend para os endpoints reais existentes. Hoje há rota implementada fora do agregador e rota esperada sem implementação.

3. Corrigir autenticação dos fetches manuais de IA.
   Arquivos: [IAStudio.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/IAStudio.tsx:35), [AIHub.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/AIHub.tsx:35)
   Mudança: substituir `fetch` manual por `request()` de [base.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/api/v2/base.ts:64), que já injeta JWT e faz retry em `401`.

4. Estabilizar `overdue-payments` em produção.
   Arquivos: [clinicMetrics.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/clinicMetrics.ts:624), [OverduePaymentsAlert.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/dashboard/OverduePaymentsAlert.tsx:27)
   Mudança: validar a query contra o schema real em produção, adicionar teste backend do contrato e garantir deploy do Worker com a versão corrigida.

5. Tirar DDL da rota de notificação.
   Arquivos: [notificationPreferences.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/notificationPreferences.ts:17), [0057_rls_complete.sql](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/migrations/0057_rls_complete.sql:488)
   Mudança: criar migration idempotente para `notification_preferences`, corrigir nomes de policy/migration, remover `CREATE/ALTER` em runtime da rota.

### `P1` nesta rodada

1. Corrigir o catálogo de imagens de exercícios no bucket público.
   Arquivos: [imageUtils.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/lib/imageUtils.ts:49), [exerciseDictionary.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/data/exerciseDictionary.ts:2670)
   Mudança: normalizar slugs legados, fazer backfill de URLs já persistidas e republicar os objetos ausentes em `media.moocafisio.com.br`.

2. Revisar o fluxo do prontuário após o crash.
   Arquivo: [PatientAnalyticsTab.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/patient/PatientAnalyticsTab.tsx:60)
   Mudança: depois de corrigir o `RangeError`, reexecutar a navegação do perfil para confirmar que as abas subsequentes (`Dados Pessoais`, `Histórico Clínico`, `Biomecânica`, `Financeiro`, `Gamificação`, `Arquivos`, `Tarefas`, `Evidência`) ficam acessíveis.

### `P2` monitoramento

1. Ignorar `ERR_ABORTED` de navegação em dashboards com auto-fetch, salvo se reproduzir manualmente sem troca de rota.

## Observações Finais

- O problema de maior impacto funcional hoje é o do perfil do paciente: a aba `Analytics & IA` quebra em runtime e impede uma auditoria estável das abas seguintes.
- Os `404` de insights não são falhas de dados; são falhas de contrato entre frontend e backend.
- Os `401` de IA não são problema de permissão do usuário em si; são chamadas frontend sem o mecanismo oficial de autenticação do app.
- Os `500` de `overdue-payments` e `notification-preferences` precisam ser validados também no deploy atual do Worker, porque o código local já indica intenções de correção, mas a produção ainda responde com erro.
- As correções principais já foram aplicadas no código local, mas ainda precisam de deploy e rerun da auditoria em produção para fechar o ciclo de validação.
