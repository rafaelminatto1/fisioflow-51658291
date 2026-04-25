# Plano de Implementação: Hub Financeiro Command Center

## 1. Objetivo

Implementar o novo hub financeiro descrito em [docs/superpowers/specs/2026-04-23-hub-financeiro-command-center-design.md](/home/rafael/Documents/fisioflow/fisioflow-51658291/docs/superpowers/specs/2026-04-23-hub-financeiro-command-center-design.md), na ordem correta, com risco controlado, sem quebrar as rotas atuais e sem reintroduzir duplicidade entre experiências financeiras.

## 2. Princípios de Execução

- Primeiro consolidar arquitetura, depois layout.
- Primeiro congelar contrato de dados, depois montar widgets.
- Não refatorar módulos financeiros “por beleza” antes de encaixá-los na nova IA.
- Entregar por fatias pequenas e integráveis.
- Sempre preservar um caminho funcional em produção durante a migração.
- Não misturar reescrita de CRM, marketing ou agenda com a entrega do hub; integrar apenas sinais e agregados necessários.

## 3. Resultado Esperado por Etapa

### Etapa 1

Uma única entrada canônica para o financeiro, sem concorrência entre `Financial` e `FinancialWorkbench`.

### Etapa 2

Um endpoint agregador que alimente o command center com payload estável.

### Etapa 3

Um novo shell visual do hub com:

- header compacto;
- quick actions;
- KPI rail;
- gráfico principal;
- projeção;
- rail lateral operacional.

### Etapa 4

Navegação interna final com módulos reorganizados:

- `Resumo`
- `Cobrança`
- `Fluxo de Caixa`
- `Faturamento`
- `Documentos`
- `Performance`
- `Comissões`

### Etapa 5

Integrações de pacientes, CRM, marketing e agenda ligadas ao financeiro via cartões e tabelas contextualizadas.

### Etapa 6

QA, rollout e remoção do legado.

## 4. Ordem Correta de Trabalho

### Fase 0: Preparação e Proteção de Migração

### Objetivo

Criar segurança operacional para migrar o hub sem quebrar a navegação e sem perder a referência do layout aprovado.

### Tarefas

- Registrar a spec e o plano no repositório.
- Confirmar qual rota é usada hoje em produção para o financeiro.
- Mapear todos os links para `/financial` e `/financeiro`.
- Definir se a migração usará:
  - feature flag temporária; ou
  - substituição direta com fallback rápido.
- Salvar a referência do Stitch como baseline visual.

### Arquivos prováveis

- [src/lib/routing/appRoutes.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/lib/routing/appRoutes.ts)
- [src/routes/core.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/routes/core.tsx)
- [src/routes/financial.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/routes/financial.tsx)
- [src/components/layout/Sidebar.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/layout/Sidebar.tsx)

### Critério de saída

- Existe clareza de rota canônica.
- Existe estratégia de rollout.
- Não há mais ambiguidade sobre o container final do financeiro.

### Fase 1: Consolidação de Rota e Arquitetura do Módulo

### Objetivo

Eliminar a duplicidade estrutural entre `Financial` e `FinancialWorkbench`.

### Tarefas

- Tornar `APP_ROUTES.FINANCIAL` a fonte única.
- Fazer `/financeiro` redirecionar para a rota canônica, ou carregar o mesmo container.
- Remover `FinancialWorkbench` do papel de hub principal.
- Se necessário, manter `FinancialWorkbench` apenas como componente legado isolado até exclusão definitiva.
- Garantir breadcrumbs, sidebar e deep links consistentes.

### Implementação recomendada

- Manter [src/pages/Financial.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/Financial.tsx) como ponto de entrada temporário do novo shell.
- Introduzir um novo container, por exemplo:
  - `src/pages/financeiro/FinancialCommandCenterPage.tsx`
- Fazer `Financial.tsx` virar um wrapper fino ou ser gradualmente substituída.

### Risco

- Quebrar links antigos internos ou favoritos do usuário.

### Mitigação

- Redirecionamentos explícitos.
- Testes de navegação cobrindo `/financial` e `/financeiro`.

### Critério de saída

- Existe uma experiência financeira única.
- A sidebar leva sempre ao mesmo hub.
- URLs antigas continuam funcionais via redirect.

### Fase 2: Contrato Agregador de Dados

### Objetivo

Parar de montar o hub a partir de hooks espalhados e criar um payload do command center.

### Tarefas

- Definir o schema do payload no backend.
- Criar rota agregadora em `financial-analytics`.
- Mapear os dados necessários para:
  - topo;
  - gráfico principal;
  - projeção;
  - lateral operacional;
  - módulos integrados.
- Unificar período de consulta para todos os blocos compatíveis.
- Preparar estados vazios e falhas parciais por bloco.

### Payload mínimo da primeira entrega

- `summary`
  - `cashPosition`
  - `receivables`
  - `payables`
  - `overdueAmount`
  - `averageTicket`
  - `estimatedMargin`
- `cashflowSeries`
- `projection30d`
- `todayCollections`
- `fiscalAlerts`
- `financialRiskPatients`
- `quickActions`
- `recentTransactions`

### Payload da segunda camada

- `patientsFinance`
- `crmRevenue`
- `marketingROI`
- `scheduleRevenueImpact`
- `recentDocuments`
- `aiSuggestions`

### Arquivos prováveis

- [apps/api/src/routes/financial-analytics.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/financial-analytics.ts)
- [apps/api/src/routes/financial.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/financial.ts)
- [src/hooks/useFinancialPage.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/hooks/useFinancialPage.ts)
- novos hooks de query específicos do command center

### Dependências

- Conhecimento das tabelas financeiras reais.
- Sinais básicos de pacientes, leads, campanhas e agenda.

### Critério de saída

- O frontend consegue renderizar a primeira dobra toda a partir de um contrato previsível.
- O período aplicado não diverge entre blocos principais.

### Fase 3: Shell do Novo Hub

### Objetivo

Trocar o layout da página sem ainda reescrever todos os submódulos.

### Tarefas

- Criar o shell base do command center.
- Implementar o novo header compacto.
- Implementar a barra de quick actions.
- Criar a grade da primeira dobra.
- Adicionar o subnav sticky.
- Mover o card de IA para posição operacional, não decorativa.

### Componentes recomendados

- `FinancialHeaderCompact`
- `FinancialQuickActionsBar`
- `FinancialKpiRail`
- `FinancialCashflowHero`
- `FinancialProjectionCard`
- `FinancialOperationsRail`
- `FinancialStickyNav`

### Estratégia

- Substituir a estrutura visual de [src/pages/Financial.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/Financial.tsx) primeiro.
- Reutilizar os dados atuais enquanto o agregador amadurece, se necessário.
- Não encaixar ainda as tabelas profundas dos submódulos no topo.

### Critério de saída

- O topo antigo foi removido.
- A primeira dobra reflete o layout aprovado no Stitch.
- A tela já passa sensação de command center mesmo antes da integração profunda.

### Fase 4: Implementação do Hub Core

### Objetivo

Fazer a primeira dobra ficar realmente útil, e não apenas bonita.

### Tarefas

- Ligar KPIs ao contrato agregador.
- Ligar gráfico principal.
- Ligar projeção de 30 dias.
- Ligar lista de cobranças do dia.
- Ligar alertas fiscais.
- Ligar pacientes em risco financeiro.
- Ligar quick actions aos fluxos reais:
  - cobrar;
  - emitir recibo;
  - emitir NFS-e;
  - registrar despesa;
  - nova transação.

### Critério de saída

- O gestor consegue responder sem rolagem:
  - como está o caixa;
  - o que cobrar hoje;
  - o que está atrasado;
  - qual o risco imediato;
  - qual a projeção curta.

### Fase 5: Reorganização da Navegação Interna

### Objetivo

Trocar a estrutura de tabs antiga por uma IA final coerente.

### Tarefas

- Substituir as tabs atuais:
  - `overview`
  - `fluxo_caixa`
  - `contas`
  - `recibos`
  - `nfe`
  - `pacotes`
  - `dre`
  - `comissoes`
- Introduzir a navegação final:
  - `Resumo`
  - `Cobrança`
  - `Fluxo de Caixa`
  - `Faturamento`
  - `Documentos`
  - `Performance`
  - `Comissões`

### Regras de migração

- `Recibos` + `NFS-e` entram em `Documentos`.
- `DRE` entra em `Performance`.
- `Pacotes` sai do primeiro nível.
- `Contas` é repartido entre `Cobrança` e `Faturamento`.

### Critério de saída

- A navegação reflete a lógica do gestor, não a lógica do código legado.

### Fase 6: Migração dos Submódulos Financeiros

### Objetivo

Aproveitar o que já existe, mas reposicionado corretamente.

### Tarefas por módulo

#### 6.1 Resumo

- Renderizar o novo command center.
- Incorporar transações recentes, documentos recentes e sugestões de IA.

#### 6.2 Cobrança

- Migrar contas a receber e inadimplência.
- Adicionar priorização por risco, vencimento e valor.
- Preparar espaço para régua de cobrança futura.

#### 6.3 Fluxo de Caixa

- Reaproveitar [src/pages/financeiro/FluxoCaixaPage.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/financeiro/FluxoCaixaPage.tsx).
- Adaptar o layout ao novo shell.
- Garantir consistência de filtros com o hub.

#### 6.4 Faturamento

- Reaproveitar partes de [src/pages/financeiro/ContasFinanceirasPage.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/financeiro/ContasFinanceirasPage.tsx).
- Unir lançamentos, despesas e operação diária.
- Separar claramente contas a pagar de cobrança.

#### 6.5 Documentos

- Unir [src/pages/financeiro/RecibosPage.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/financeiro/RecibosPage.tsx) e [src/pages/financeiro/NFSePage.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/financeiro/NFSePage.tsx).
- Criar visão única de comprovantes e fiscais.
- Exibir pendências, recentes e ações rápidas.

#### 6.6 Performance

- Reaproveitar [src/components/financial/dre/FinancialDRE.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/financial/dre/FinancialDRE.tsx).
- Adicionar ticket, margem, receita por origem, LTV e ROI.

#### 6.7 Comissões

- Reaproveitar [src/components/financial/CommissionsDashboard.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/financial/CommissionsDashboard.tsx).
- Encaixar no padrão visual e de navegação novo.

### Critério de saída

- Todos os submódulos principais estão acessíveis sob a nova IA sem visual fragmentado.

### Fase 7: Integrações com Pacientes, CRM, Marketing e Agenda

### Objetivo

Transformar o hub em centro de receita, não apenas em extrato.

### Tarefas

#### 7.1 Pacientes

- Trazer saldo pendente por paciente.
- Trazer pacote vencendo.
- Trazer risco de evasão cruzando financeiro e agenda.
- Linkar para perfil do paciente.

#### 7.2 CRM

- Mostrar leads com maior potencial de receita.
- Mostrar receita prevista de funil.
- Mostrar conversão por origem.
- Linkar para `/crm`.

#### 7.3 Marketing

- Mostrar campanhas com ROI.
- Mostrar CAC.
- Mostrar reativação com melhor retorno.
- Linkar para páginas de marketing relevantes.

#### 7.4 Agenda

- Mostrar receita projetada a partir de sessões agendadas.
- Mostrar impacto de no-show.
- Mostrar capacidade ociosa com impacto financeiro.

### Dependência

- Esses blocos devem consumir agregados e não acessar páginas externas diretamente.

### Critério de saída

- O financeiro passa a responder:
  - de onde a receita vem;
  - onde ela se perde;
  - onde existe oportunidade de ganho.

### Fase 8: UX Polishing e Estados de Exceção

### Objetivo

Fechar comportamento real de tela, não só happy path.

### Tarefas

- Ajustar loading por bloco.
- Ajustar erro parcial por widget.
- Ajustar estados vazios coerentes para clínicas novas.
- Validar responsividade desktop/tablet/mobile.
- Ajustar sticky nav, overflow horizontal e hierarquia visual final.

### Critério de saída

- A página continua utilizável com pouco dado, muito dado ou falhas parciais.

### Fase 9: QA, Telemetria e Rollout

### Objetivo

Subir com segurança e medir uso real.

### Tarefas

- Testes unitários dos novos hooks e mapeadores.
- Testes E2E:
  - abrir hub;
  - trocar período;
  - navegar pelas abas;
  - acionar quick actions;
  - abrir documentos;
  - abrir cobrança prioritária.
- Instrumentar eventos:
  - tab view;
  - export;
  - quick action click;
  - cobrança executada;
  - documento emitido.
- Remover o legado quando os redirects e a telemetria estiverem estáveis.

### Critério de saída

- O novo hub é o padrão.
- O legado não é mais necessário.

## 5. Sequência Recomendada de PRs

### PR 1

Rota canônica + remoção da duplicidade `FinancialWorkbench`.

### PR 2

Contrato agregador backend + hooks do command center.

### PR 3

Shell visual novo + header + first fold.

### PR 4

Subnav final + reorganização de tabs.

### PR 5

Migração de `Documentos` e `Performance`.

### PR 6

Migração de `Cobrança`, `Faturamento` e `Fluxo de Caixa`.

### PR 7

Integrações de pacientes, CRM, marketing e agenda.

### PR 8

Polimento, testes, telemetria e remoção do legado.

## 6. Arquivos Mais Prováveis de Mudança

### Frontend

- [src/pages/Financial.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/Financial.tsx)
- [src/routes/core.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/routes/core.tsx)
- [src/routes/financial.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/routes/financial.tsx)
- [src/lib/routing/appRoutes.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/lib/routing/appRoutes.ts)
- novos componentes em `src/components/financial/`
- hooks em `src/hooks/financial/` ou equivalente

### Backend

- [apps/api/src/routes/financial-analytics.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/financial-analytics.ts)
- [apps/api/src/routes/financial.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/financial.ts)
- possivelmente serviços e queries agregadas relacionadas

## 7. Dependências Entre Fases

- Fase 1 depende apenas de contexto de rota.
- Fase 2 depende da decisão de IA final.
- Fase 3 depende de Fase 1 e idealmente de Fase 2.
- Fase 4 depende de Fase 2.
- Fase 5 depende de Fases 3 e 4.
- Fase 6 depende de Fase 5.
- Fase 7 depende de Fase 2 e de blocos mínimos já existentes em cada domínio.
- Fases 8 e 9 dependem de todas as anteriores.

## 8. O Que Não Fazer Durante a Implementação

- Não expandir escopo para reconciliação bancária completa na mesma trilha.
- Não reescrever CRM/marketing/agenda.
- Não manter duas home pages financeiras em paralelo por várias PRs.
- Não introduzir novos widgets sem contrato de dados claro.
- Não reabrir discussão de IA depois da Fase 1.

## 9. Checklists de Saída

### Hub Core pronto

- Header compacto entregue.
- Topo alto removido.
- KPI rail funcional.
- Gráfico principal funcional.
- Projeção funcional.
- Lateral operacional funcional.

### IA final pronta

- `Resumo`
- `Cobrança`
- `Fluxo de Caixa`
- `Faturamento`
- `Documentos`
- `Performance`
- `Comissões`

### Integrações prontas

- pacientes
- CRM
- marketing
- agenda

### Legado removido

- `FinancialWorkbench` fora da rota principal.
- redirects estáveis.
- telemetria mínima ativa.

## 10. Próxima Ação Recomendada

Começar pela `PR 1: rota canônica + container final do hub`, porque todas as outras fases dependem dessa consolidação estrutural.
