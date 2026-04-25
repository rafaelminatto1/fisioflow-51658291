# Spec Técnica: Hub Financeiro Command Center

## 1. Visão Geral

O módulo financeiro do FisioFlow hoje está fragmentado entre um hub mais completo em [src/pages/Financial.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/Financial.tsx) e uma implementação paralela/provisória em [src/components/financial/FinancialWorkbench.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/financial/FinancialWorkbench.tsx), ainda exposta por [src/routes/financial.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/routes/financial.tsx). Além disso, a página principal desperdiça altura útil com um topo excessivamente grande e trata blocos estratégicos como abas desconectadas, em vez de um cockpit operacional integrado.

O objetivo desta entrega é transformar o financeiro em um command center real para a clínica, com:

- topo compacto e orientado à ação;
- primeira dobra com caixa, cobrança, risco e projeção;
- navegação interna organizada por contexto operacional;
- módulos conectados com pacientes, CRM, marketing, agenda e documentos fiscais;
- uma única arquitetura de rota, layout e contrato de dados.

## 2. Objetivos

- Eliminar a duplicidade entre `/financial` e `/financeiro` como experiências distintas.
- Reduzir drasticamente a altura desperdiçada no topo da página.
- Tornar visível sem rolagem excessiva:
  - posição de caixa;
  - contas a receber;
  - contas a pagar;
  - inadimplência;
  - projeção de curto prazo;
  - pendências fiscais e operacionais.
- Reorganizar o módulo em áreas coerentes de gestão, não em abas soltas por entidade técnica.
- Integrar sinais financeiros com:
  - pacientes;
  - CRM;
  - marketing;
  - agenda/operação.
- Criar uma base de dados agregada para servir o hub sem excesso de composição no frontend.
- Preparar o módulo para evolução posterior de régua de cobrança, reconciliação, forecast e inteligência financeira.

## 3. Estado Atual

### 3.1 Estrutura de rota e página

- A rota principal carregada no núcleo do app é [src/routes/core.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/routes/core.tsx), que usa `Financial` de [src/pages/Financial.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/Financial.tsx).
- As rotas em [src/routes/financial.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/routes/financial.tsx) ainda expõem `/financeiro` e `/financial` via `FinancialWorkbench`, criando conflito conceitual com a experiência principal.
- A sidebar já aponta o financeiro como item estratégico em [src/components/layout/Sidebar.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/layout/Sidebar.tsx), mas o módulo ainda não tem uma IA coesa.

### 3.2 Página atual

- [src/pages/Financial.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/Financial.tsx) concentra:
  - header grande demais;
  - card de IA;
  - cards de resumo;
  - tabs para `overview`, `fluxo_caixa`, `contas`, `recibos`, `nfe`, `pacotes`, `dre`, `comissoes`.
- Existem bons blocos reaproveitáveis em:
  - [src/pages/financeiro/FluxoCaixaPage.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/financeiro/FluxoCaixaPage.tsx)
  - [src/pages/financeiro/ContasFinanceirasPage.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/financeiro/ContasFinanceirasPage.tsx)
  - [src/pages/financeiro/RecibosPage.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/financeiro/RecibosPage.tsx)
  - [src/pages/financeiro/NFSePage.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/financeiro/NFSePage.tsx)
  - [src/components/financial/dre/FinancialDRE.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/financial/dre/FinancialDRE.tsx)
  - [src/components/financial/CommissionsDashboard.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/financial/CommissionsDashboard.tsx)

### 3.3 Pontos de integração já existentes

- Pacientes:
  - [src/components/patient/PatientFinancialTab.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/patient/PatientFinancialTab.tsx)
- CRM:
  - [src/pages/crm/CRMDashboard] e componentes em [src/components/crm](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/crm)
- Marketing:
  - rotas e páginas em [src/routes/marketing.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/routes/marketing.tsx) e [src/pages/marketing](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/marketing)
- Analytics/API:
  - [apps/api/src/routes/financial-analytics.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/financial-analytics.ts)
  - [apps/api/src/routes/financial.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/financial.ts)
  - [apps/api/src/routes/financial-commerce.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/financial-commerce.ts)
  - [apps/api/src/routes/financial-catalogs.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/financial-catalogs.ts)

## 4. Problemas a Resolver

### 4.1 UX e layout

- O topo ocupa espaço demais para pouco valor operacional.
- A primeira dobra não responde rapidamente:
  - o que preciso fazer agora;
  - o que está em risco;
  - onde está a oportunidade de receita.
- O sistema mistura resumo estratégico e detalhe operacional sem hierarquia clara.

### 4.2 Arquitetura de produto

- Há duas experiências financeiras concorrentes.
- Abas foram criadas por domínio técnico, não por fluxo de gestão.
- `Pacotes`, `DRE`, `Recibos`, `NFS-e` e `Contas` competem pelo mesmo nível hierárquico mesmo tendo pesos de uso diferentes.

### 4.3 Dados

- O hub atual depende demais de composições fragmentadas.
- Não existe um contrato único do “command center”.
- Faltam agregados prontos para conectar financeiro a CRM, agenda, marketing e pacientes.

### 4.4 Integração de ecossistema

- O financeiro ainda se comporta como um módulo isolado.
- Não há leitura operacional cruzada de:
  - pacientes com saldo pendente e risco de evasão;
  - leads com maior potencial de receita;
  - campanhas com melhor ROI;
  - agenda com impacto financeiro direto.

## 5. Escopo

### Incluído

- Redesenho completo do hub financeiro desktop.
- Consolidação de rota e shell do módulo.
- Nova IA de navegação do financeiro.
- Novo command center de primeira dobra.
- Integração visual e analítica com pacientes, CRM, marketing e agenda.
- Reorganização das abas/módulos existentes.
- Contrato agregador de dados para o hub.

### Fora de Escopo

- Reescrever todos os submódulos financeiros internamente nesta mesma entrega.
- Implementar conciliação bancária completa nesta primeira fase.
- Reescrever CRM, marketing ou agenda fora do que for necessário para integração do hub.
- Substituir toda a modelagem fiscal/tributária do backend.

## 6. Estrutura Visual Aprovada

Direção validada a partir do conceito gerado no Stitch para o projeto `FisioFlow - Hub Financeiro 2026`:

- header compacto, sem hero alto;
- linha secundária de quick actions;
- primeira dobra em layout principal + rail lateral;
- subnav sticky por contexto;
- módulos integrados de negócio logo abaixo da camada principal;
- tabelas/listas úteis no terço inferior da página;
- linguagem visual premium clínica, light-first, com densidade alta porém calma.

## 7. Arquitetura de Informação Final

### 7.1 Header

O topo da página deve conter apenas:

- título `Gestão Financeira`;
- subtítulo curto;
- seletor de período;
- ação `Exportar`;
- CTA primário `Nova Transação`;
- linha secundária com atalhos:
  - `Cobrar paciente`
  - `Emitir recibo`
  - `Emitir NFS-e`
  - `Registrar despesa`

### 7.2 Primeira dobra

Layout recomendado `8/4` ou `9/3`.

#### Coluna principal

- faixa de KPIs operacionais:
  - caixa disponível;
  - a receber;
  - a pagar;
  - inadimplência;
  - ticket médio;
  - margem estimada;
- gráfico principal de fluxo de caixa;
- bloco de projeção dos próximos 30 dias;

#### Coluna lateral

- central de ações rápidas;
- alertas fiscais e operacionais;
- pacientes em risco financeiro;
- cobranças a fazer hoje;
- bloco de IA financeira acionável.

### 7.3 Navegação interna sticky

O hub deve usar esta navegação final:

- `Resumo`
- `Cobrança`
- `Fluxo de Caixa`
- `Faturamento`
- `Documentos`
- `Performance`
- `Comissões`

## 8. Decisões de Produto para Abas e Módulos

### 8.1 Módulos que permanecem como áreas principais

- `Resumo`
- `Cobrança`
- `Fluxo de Caixa`
- `Faturamento`
- `Documentos`
- `Performance`
- `Comissões`

### 8.2 Módulos que mudam de posição

- `Recibos` e `NFS-e` passam a compor `Documentos`.
- `DRE` passa a compor `Performance`.
- `Pacotes` deixa de ser aba principal e vira contexto dentro de `Cobrança` e `Paciente`.
- `Contas` deixa de ser experiência própria na home do módulo e passa a se distribuir entre:
  - `Cobrança` para contas a receber;
  - `Faturamento` para despesas, lançamentos e contas a pagar.

### 8.3 Justificativa

Isso reduz concorrência visual entre abas, melhora a descoberta de tarefas e faz a navegação seguir o raciocínio do gestor:

- entender a situação;
- agir sobre cobrança;
- ler o caixa;
- operar faturamento;
- resolver documentos;
- acompanhar performance;
- fechar repasses.

## 9. Módulos Integrados do Ecossistema

### 9.1 Pacientes

O hub deve trazer:

- ranking de pacientes com maior saldo pendente;
- pacientes com pacote vencendo ou crédito acabando;
- LTV por paciente;
- risco de evasão cruzando financeiro + agenda.

### 9.2 CRM

O hub deve mostrar:

- leads com maior potencial de receita;
- receita prevista do funil;
- conversão por origem;
- oportunidades paradas com impacto financeiro.

### 9.3 Marketing

O hub deve mostrar:

- campanhas com melhor ROI;
- custo por paciente adquirido;
- reativação com melhor retorno;
- origem de pacientes que mais geram receita líquida.

### 9.4 Agenda / Operação

O hub deve mostrar:

- sessões agendadas que viram receita projetada;
- no-show com impacto financeiro;
- capacidade ociosa por janela;
- pacientes sem agenda futura, mas com saldo ou plano ativo.

## 10. Funcionalidades Novas Recomendadas

### 10.1 Entram já no planejamento principal

- projeção de caixa 30 dias;
- visão 90 dias como evolução posterior do mesmo bloco;
- central de cobranças prioritárias;
- fila de pendências fiscais;
- risco financeiro por paciente;
- previsão de receita por pipeline de CRM;
- ROI e CAC conectados à base de pacientes;
- impacto financeiro de agenda e no-show;
- IA financeira com tarefas e sugestões acionáveis.

### 10.2 Entram como evolução posterior

- régua de cobrança automatizada completa;
- reconciliação bancária;
- cenário “e se” para previsão;
- fechamento mensal guiado;
- governança de centros de custo avançados.

## 11. Contrato de Dados Recomendado

Criar um endpoint agregador do command center financeiro, preferencialmente em [apps/api/src/routes/financial-analytics.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/financial-analytics.ts).

### 11.1 Payload de topo

- `cashPosition`
- `receivables`
- `payables`
- `overdueAmount`
- `averageTicket`
- `estimatedMargin`
- `period`

### 11.2 Payload do gráfico principal

- série por período com:
  - `date`
  - `entries`
  - `exits`
  - `net`
  - `accumulated`

### 11.3 Payload de projeção

- `next30Days.expectedEntries`
- `next30Days.expectedExits`
- `next30Days.projectedBalance`
- `next30Days.riskEvents`

### 11.4 Payload lateral operacional

- `todayCollections`
- `fiscalAlerts`
- `financialRiskPatients`
- `quickActionsState`
- `aiSuggestions`

### 11.5 Payload de integrações

- `patientsFinance`
- `crmRevenue`
- `marketingROI`
- `scheduleRevenueImpact`

## 12. Arquitetura Frontend Recomendada

### 12.1 Shell principal

O novo hub deve nascer como shell modular, não como página monolítica.

Estrutura recomendada:

- `FinancialCommandCenterPage`
- `FinancialHeaderCompact`
- `FinancialQuickActionsBar`
- `FinancialKpiRail`
- `FinancialCashflowHero`
- `FinancialProjectionCard`
- `FinancialOperationsRail`
- `FinancialStickyNav`
- `FinancialIntegratedModulesGrid`
- `FinancialPriorityCollectionsTable`
- `FinancialRecentTransactionsList`
- `FinancialDocumentsFeed`
- `FinancialAIWorkbench`

### 12.2 Reuso

Reaproveitar o que já funciona nos módulos existentes, mas remover a lógica de “aba como página inteira” de dentro do hub principal.

### 12.3 Rota canônica

- `APP_ROUTES.FINANCIAL` em [src/lib/routing/appRoutes.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/lib/routing/appRoutes.ts) continua como fonte única.
- `/financeiro` deve redirecionar para a experiência unificada ou apontar para o mesmo container, sem workbench paralelo.

## 13. Ordem Correta de Implementação

### Fase 1: Fundação

- Consolidar rota única do financeiro.
- Remover a competição entre `Financial` e `FinancialWorkbench`.
- Congelar a IA final e validar a V2 do layout no Stitch.
- Formalizar o contrato agregador do command center.
- Criar o shell modular do novo hub.

### Fase 2: Hub Core

- Implementar header compacto.
- Implementar quick actions.
- Implementar KPI rail.
- Implementar gráfico principal.
- Implementar projeção de 30 dias.
- Implementar rail lateral com alertas, cobranças do dia e pacientes em risco financeiro.

### Fase 3: Reorganização dos módulos financeiros

- Reestruturar a navegação para:
  - `Resumo`
  - `Cobrança`
  - `Fluxo de Caixa`
  - `Faturamento`
  - `Documentos`
  - `Performance`
  - `Comissões`
- Migrar `Recibos` + `NFS-e` para `Documentos`.
- Migrar `DRE` para `Performance`.
- Rebaixar `Pacotes` para contexto secundário.

### Fase 4: Integrações do ecossistema

- Conectar pacientes ao command center.
- Conectar CRM.
- Conectar marketing.
- Conectar agenda/operação.
- Unificar leitura de oportunidade, risco e receita.

### Fase 5: QA e rollout

- Teste responsivo.
- Teste de permissão por papel.
- Teste de performance.
- Telemetria de uso por módulo.
- Rollout gradual, se necessário, via feature flag.
- Remoção final do legado.

## 14. Dependências Técnicas

- Revisão das rotas em:
  - [src/routes/core.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/routes/core.tsx)
  - [src/routes/financial.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/routes/financial.tsx)
- Revisão de contratos e hooks:
  - [src/hooks/useFinancialPage.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/hooks/useFinancialPage.ts)
  - hooks de fluxo de caixa e contas
- Backend financeiro:
  - [apps/api/src/routes/financial-analytics.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/financial-analytics.ts)
  - [apps/api/src/routes/financial.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/financial.ts)
- Integrações:
  - pacientes
  - CRM
  - marketing
  - agenda

## 15. Riscos

- Reaproveitar componentes existentes demais pode arrastar a IA antiga para o novo hub.
- Sem endpoint agregador, o frontend vai virar uma colagem de hooks e perder performance.
- Se a duplicidade de rotas não for eliminada cedo, a entrega tende a fragmentar novamente.
- A integração com CRM/marketing/agenda precisa nascer com escopo controlado para não virar reescrita transversal.

## 16. Estratégia de Testes

- Testes de navegação e deep-linking por aba do hub.
- Testes dos quick actions principais.
- Testes do período aplicado aos blocos agregados.
- Testes de estados vazios:
  - sem transações;
  - sem documentos;
  - sem cobranças;
  - sem dados de integração.
- Testes de permissão para exposição de valores sensíveis.
- Testes E2E do fluxo:
  - nova transação;
  - cobrança prioritária;
  - emissão de documento;
  - navegação entre módulos.

## 17. Referências Externas

Padrões usados como referência para a arquitetura e distribuição do hub:

- [Xero Dashboard](https://www.xero.com/us/accounting-software/dashboard/)
- [QuickBooks Cash Flow Planner](https://quickbooks.intuit.com/global/cash-flow/)
- [Stripe Reporting](https://docs.stripe.com/reports)
- [Stripe Revenue Recognition](https://docs.stripe.com/revenue-recognition/reports)
- [HubSpot Reporting Dashboards](https://www.hubspot.com/products/reporting-dashboards)
- [Zoho Books Overview](https://www.zoho.com/books/help/getting-started/zoho-books.html)

## 18. Resultado Esperado

Ao final desta iniciativa, o financeiro deixa de ser uma coleção de telas e passa a ser o centro operacional da receita da clínica:

- com leitura imediata de caixa e risco;
- com ação rápida para cobrança e faturamento;
- com conexão direta entre receita, paciente, lead, campanha e agenda;
- com uma base sólida para forecast, automação e governança financeira.
