# Planejamento de Implementação - FisioFlow

## Status Atual ✅

### Concluído
- ✅ Banco de dados PostgreSQL (Supabase) com todas as tabelas
- ✅ RLS policies configuradas
- ✅ Sistema de autenticação básico (Auth.tsx)
- ✅ ProtectedRoute implementado
- ✅ Estrutura base de componentes UI (shadcn)
- ✅ Layout principal com Sidebar
- ✅ Rotas definidas no App.tsx

### Pendente
- ❌ Correção de erros TypeScript
- ❌ Páginas CRUD completas para Eventos
- ❌ Gestão de Prestadores
- ❌ Sistema de Checklist
- ❌ Gestão de Participantes
- ❌ Dashboard Financeiro
- ❌ Relatórios
- ❌ Validações Zod completas
- ❌ Testes

---

## FASE 1: Correções Críticas (1-2 dias)
**Prioridade: CRÍTICA**

### 1.1 Corrigir Erros de Build
- [ ] Corrigir tipos em `PatientDashboard.tsx`
  - Propriedade 'reps' → 'repetitions'
  - Adicionar campo 'progress' em Patient
- [ ] Corrigir tipos em `TherapistDashboard.tsx`
  - Resolver instantiação profunda de tipos
- [ ] Corrigir tipos em `NewPatientModal.tsx`
  - Ajustar mensagens de erro do react-hook-form
- [ ] Corrigir tipos em `Vouchers.tsx`
  - Criar tipo Voucher adequado ou remover página

**Arquivos afetados:**
- `src/components/dashboard/PatientDashboard.tsx`
- `src/components/dashboard/TherapistDashboard.tsx`
- `src/components/modals/NewPatientModal.tsx`
- `src/pages/Vouchers.tsx`
- `src/types/index.ts`

---

## FASE 2: Sistema de Eventos (3-4 dias)
**Prioridade: ALTA**

### 2.1 Validações Zod
- [ ] Criar `src/lib/validations/evento.ts`
  ```typescript
  - eventoSchema
  - eventoCreateSchema
  - eventoUpdateSchema
  ```

### 2.2 Domain Layer - Eventos
- [ ] Criar `src/domain/evento/EventoService.ts`
  - CRUD completo
  - Busca por status, categoria, data
  - Cálculo de custo total do evento
  - Exportação CSV/PDF

### 2.3 Hooks Personalizados
- [ ] Criar `src/hooks/useEventos.ts`
  - useEventos (lista, busca, filtros)
  - useEvento (detalhe único)
  - useCreateEvento
  - useUpdateEvento
  - useDeleteEvento

### 2.4 Componentes UI
- [ ] Criar `src/components/eventos/EventoCard.tsx`
- [ ] Criar `src/components/eventos/EventoList.tsx`
- [ ] Criar `src/components/eventos/EventoFilters.tsx`
- [ ] Criar `src/components/eventos/EventoTimeline.tsx`
- [ ] Criar `src/components/modals/NewEventoModal.tsx`
- [ ] Criar `src/components/modals/EditEventoModal.tsx`
- [ ] Criar `src/components/modals/ViewEventoModal.tsx`

### 2.5 Página Principal
- [ ] Criar `src/pages/Eventos.tsx`
  - Listagem com tabela/cards
  - Busca global
  - Filtros por status/categoria/data
  - Botão "Novo Evento"
  - Ações: Visualizar, Editar, Excluir

**Arquivos afetados:**
- `src/lib/validations/evento.ts` (novo)
- `src/domain/evento/` (novo)
- `src/hooks/useEventos.ts` (novo)
- `src/components/eventos/` (novo)
- `src/pages/Eventos.tsx` (novo)
- `src/App.tsx` (adicionar rota)

---

## FASE 3: Gestão de Prestadores (2-3 dias)
**Prioridade: ALTA**

### 3.1 Validações Zod
- [ ] Criar `src/lib/validations/prestador.ts`
  ```typescript
  - prestadorSchema
  - prestadorCreateSchema
  - pagamentoSchema
  ```

### 3.2 Domain Layer
- [ ] Criar `src/domain/prestador/PrestadorService.ts`
  - CRUD de prestadores por evento
  - Controle de pagamento (PENDENTE/PAGO)
  - Cálculo de total pago/pendente
  - Exportação CSV

### 3.3 Hooks
- [ ] Criar `src/hooks/usePrestadores.ts`
  - usePrestadoresByEvento
  - useCreatePrestador
  - useUpdatePrestador
  - useDeletePrestador
  - useMarcarPagamento

### 3.4 Componentes
- [ ] Criar `src/components/prestadores/PrestadorTable.tsx`
- [ ] Criar `src/components/prestadores/PrestadorForm.tsx`
- [ ] Criar `src/components/prestadores/PagamentoControl.tsx`
- [ ] Criar `src/components/modals/NewPrestadorModal.tsx`

### 3.5 Integração
- [ ] Adicionar tab "Prestadores" na página de detalhe do evento
- [ ] Resumo financeiro (total prestadores)

**Arquivos afetados:**
- `src/lib/validations/prestador.ts` (novo)
- `src/domain/prestador/` (novo)
- `src/hooks/usePrestadores.ts` (novo)
- `src/components/prestadores/` (novo)

---

## FASE 4: Sistema de Checklist (2-3 dias)
**Prioridade: MÉDIA**

### 4.1 Validações Zod
- [ ] Criar `src/lib/validations/checklist.ts`
  ```typescript
  - checklistItemSchema
  - checklistItemCreateSchema
  ```

### 4.2 Domain Layer
- [ ] Criar `src/domain/checklist/ChecklistService.ts`
  - CRUD de itens
  - Agrupamento por tipo (levar/alugar/comprar)
  - Cálculo de custo total
  - Marcação de status (ABERTO/OK)

### 4.3 Hooks
- [ ] Criar `src/hooks/useChecklist.ts`
  - useChecklistByEvento
  - useCreateChecklistItem
  - useUpdateChecklistItem
  - useToggleChecklistItem

### 4.4 Componentes
- [ ] Criar `src/components/checklist/ChecklistTable.tsx`
- [ ] Criar `src/components/checklist/ChecklistSummary.tsx`
- [ ] Criar `src/components/checklist/ChecklistItemForm.tsx`

### 4.5 Integração
- [ ] Adicionar tab "Checklist" na página de evento
- [ ] Resumo de custos por tipo

**Arquivos afetados:**
- `src/lib/validations/checklist.ts` (novo)
- `src/domain/checklist/` (novo)
- `src/hooks/useChecklist.ts` (novo)
- `src/components/checklist/` (novo)

---

## FASE 5: Gestão de Participantes (2 dias)
**Prioridade: MÉDIA**

### 5.1 Validações Zod
- [ ] Criar `src/lib/validations/participante.ts`
  ```typescript
  - participanteSchema
  - participanteCreateSchema
  - instagramValidation
  ```

### 5.2 Domain Layer
- [ ] Criar `src/domain/participante/ParticipanteService.ts`
  - CRUD de participantes por evento
  - Validação de Instagram
  - Exportação CSV/Excel
  - Estatísticas (total, seguem perfil, etc.)

### 5.3 Hooks
- [ ] Criar `src/hooks/useParticipantes.ts`
  - useParticipantesByEvento
  - useCreateParticipante
  - useUpdateParticipante
  - useDeleteParticipante
  - useExportParticipantes

### 5.4 Componentes
- [ ] Criar `src/components/participantes/ParticipanteTable.tsx`
- [ ] Criar `src/components/participantes/ParticipanteForm.tsx`
- [ ] Criar `src/components/participantes/ParticipanteStats.tsx`

### 5.5 Integração
- [ ] Adicionar tab "Participantes" na página de evento
- [ ] Botão exportar CSV/PDF

**Arquivos afetados:**
- `src/lib/validations/participante.ts` (novo)
- `src/domain/participante/` (novo)
- `src/hooks/useParticipantes.ts` (novo)
- `src/components/participantes/` (novo)

---

## FASE 6: Dashboard Financeiro (3-4 dias)
**Prioridade: ALTA**

### 6.1 Validações Zod
- [ ] Criar `src/lib/validations/pagamento.ts`
  ```typescript
  - pagamentoSchema
  - pagamentoCreateSchema
  ```

### 6.2 Domain Layer
- [ ] Criar `src/domain/financeiro/FinanceiroService.ts`
  - Registro de pagamentos
  - Cálculo de custo total por evento
  - Cálculo de margem (se houver receita)
  - Relatório por categoria
  - Exportação CSV/PDF

### 6.3 Hooks
- [ ] Criar `src/hooks/useFinanceiro.ts`
  - useFinanceiroByEvento
  - useCreatePagamento
  - useCustoTotal
  - useRelatorioFinanceiro

### 6.4 Componentes
- [ ] Criar `src/components/financeiro/ResumoFinanceiro.tsx`
  - Cards: Total Prestadores, Total Insumos, Total Outros, Total Geral
- [ ] Criar `src/components/financeiro/PagamentoTable.tsx`
- [ ] Criar `src/components/financeiro/PagamentoForm.tsx`
- [ ] Criar `src/components/financeiro/GraficoFinanceiro.tsx`
  - Gráfico de barras por categoria

### 6.5 Página
- [ ] Criar `src/pages/FinanceiroEvento.tsx`
  - Resumo financeiro completo
  - Lista de pagamentos
  - Botão "Registrar Pagamento"

**Arquivos afetados:**
- `src/lib/validations/pagamento.ts` (novo)
- `src/domain/financeiro/` (novo)
- `src/hooks/useFinanceiro.ts` (novo)
- `src/components/financeiro/` (novo)
- `src/pages/FinanceiroEvento.tsx` (novo)

---

## FASE 7: Relatórios e Exportações (2 dias)
**Prioridade: MÉDIA

### 7.1 Relatórios
- [ ] Criar `src/domain/relatorio/RelatorioService.ts`
  - Relatório de evento completo (PDF)
  - Exportação de participantes (CSV/Excel)
  - Exportação de prestadores (CSV)
  - Relatório financeiro consolidado

### 7.2 Componentes
- [ ] Criar `src/components/relatorios/RelatorioEvento.tsx`
- [ ] Criar `src/components/relatorios/ExportButton.tsx`

### 7.3 Página
- [ ] Atualizar `src/pages/Reports.tsx`
  - Lista de relatórios disponíveis
  - Filtros por período
  - Download de relatórios

**Arquivos afetados:**
- `src/domain/relatorio/` (novo)
- `src/components/relatorios/` (novo)
- `src/pages/Reports.tsx` (atualizar)

---

## FASE 8: RBAC e Segurança (2 dias)
**Prioridade: ALTA**

### 8.1 Controle de Acesso
- [ ] Atualizar `src/hooks/usePermissions.ts`
  - Permissões granulares por recurso
  - admin: tudo
  - fisio: criar/editar eventos, prestadores, participantes
  - estagiário: visualizar, adicionar participantes

### 8.2 Proteção de Rotas
- [ ] Adicionar verificação de permissão em cada página
- [ ] Bloquear ações baseadas em role

### 8.3 UI Condicional
- [ ] Ocultar botões/ações que o usuário não tem permissão
- [ ] Exibir mensagens adequadas

**Arquivos afetados:**
- `src/hooks/usePermissions.ts` (atualizar)
- Todas as páginas principais (adicionar checks)

---

## FASE 9: Busca Global (1 dia)
**Prioridade: BAIXA**

### 9.1 Componente de Busca
- [ ] Criar `src/components/layout/GlobalSearch.tsx`
  - Buscar eventos por nome
  - Buscar participantes por nome/instagram
  - Buscar prestadores por nome
  - Exibir resultados com navegação

### 9.2 Integração
- [ ] Adicionar no Header/Sidebar
- [ ] Atalho de teclado (Ctrl+K)

**Arquivos afetados:**
- `src/components/layout/GlobalSearch.tsx` (novo)
- `src/components/layout/MainLayout.tsx` (atualizar)

---

## FASE 10: Polimentos e UX (2-3 dias)
**Prioridade: MÉDIA**

### 10.1 Loading States
- [ ] Adicionar Skeletons em todas as listas
- [ ] Spinners em ações assíncronas
- [ ] Estados vazios (EmptyState components)

### 10.2 Toasts e Feedback
- [ ] Mensagens de sucesso/erro em todas as ações
- [ ] Confirmações de exclusão (AlertDialog)

### 10.3 Acessibilidade
- [ ] Labels em todos os inputs
- [ ] ARIA attributes
- [ ] Navegação por teclado
- [ ] Contraste de cores ≥ 4.5:1

### 10.4 Responsividade
- [ ] Testar em mobile (320px+)
- [ ] Testar em tablet (768px+)
- [ ] Ajustar tabelas para mobile (cards)

**Arquivos afetados:**
- Todos os componentes principais

---

## FASE 11: Testes (3-4 dias)
**Prioridade: MÉDIA**

### 11.1 Testes Unitários (Vitest)
- [ ] Testar validações Zod
- [ ] Testar utils/helpers
- [ ] Testar hooks customizados

### 11.2 Testes de Componentes (Testing Library)
- [ ] Testar formulários
- [ ] Testar modais
- [ ] Testar interações

### 11.3 Testes E2E (Playwright)
- [ ] Fluxo completo: Login → Criar Evento → Adicionar Prestador → Checklist → Participantes
- [ ] Fluxo de pagamento
- [ ] Fluxo de relatórios

**Arquivos afetados:**
- `src/__tests__/` (novo diretório)
- `vitest.config.ts` (configurar)

---

## FASE 12: Documentação (1-2 dias)
**Prioridade: BAIXA**

### 12.1 README
- [ ] Atualizar `README.md`
  - Instruções de instalação
  - Variáveis de ambiente
  - Como rodar localmente
  - Como rodar testes
  - Estrutura do projeto

### 12.2 Documentação Técnica
- [ ] Criar `docs/ARQUITETURA.md`
- [ ] Criar `docs/FLUXOS.md`
- [ ] Criar `docs/API.md`

### 12.3 Guias
- [ ] Criar `docs/GUIA_USUARIO.md`
- [ ] Criar `docs/DEPLOYMENT.md`

**Arquivos afetados:**
- `README.md` (atualizar)
- `docs/` (novo diretório)

---

## TODO List Resumida

### 🔴 Crítico (Fazer Agora)
1. [ ] Corrigir erros TypeScript (build quebrado)
2. [ ] Implementar CRUD completo de Eventos
3. [ ] Implementar gestão de Prestadores
4. [ ] Implementar Dashboard Financeiro
5. [ ] Configurar RBAC completo

### 🟡 Importante (Próxima Sprint)
6. [ ] Implementar Checklist
7. [ ] Implementar Participantes
8. [ ] Implementar Relatórios
9. [ ] Adicionar busca global

### 🟢 Desejável (Backlog)
10. [ ] Testes automatizados
11. [ ] Polimentos de UX
12. [ ] Documentação completa
13. [ ] Otimizações de performance

---

## Cronograma Estimado

| Fase | Duração | Início | Fim |
|------|---------|--------|-----|
| Fase 1: Correções | 2 dias | Dia 1 | Dia 2 |
| Fase 2: Eventos | 4 dias | Dia 3 | Dia 6 |
| Fase 3: Prestadores | 3 dias | Dia 7 | Dia 9 |
| Fase 4: Checklist | 3 dias | Dia 10 | Dia 12 |
| Fase 5: Participantes | 2 dias | Dia 13 | Dia 14 |
| Fase 6: Financeiro | 4 dias | Dia 15 | Dia 18 |
| Fase 7: Relatórios | 2 dias | Dia 19 | Dia 20 |
| Fase 8: RBAC | 2 dias | Dia 21 | Dia 22 |
| Fase 9: Busca | 1 dia | Dia 23 | Dia 23 |
| Fase 10: UX | 3 dias | Dia 24 | Dia 26 |
| Fase 11: Testes | 4 dias | Dia 27 | Dia 30 |
| Fase 12: Docs | 2 dias | Dia 31 | Dia 32 |

**Total: ~32 dias úteis (6-7 semanas)**

---

## Métricas de Sucesso

### Técnicas
- [ ] ✅ 0 erros TypeScript
- [ ] ✅ Cobertura de testes > 70%
- [ ] ✅ Performance Lighthouse > 85
- [ ] ✅ Acessibilidade WCAG 2.1 AA

### Funcionais
- [ ] ✅ CRUD completo de Eventos funcionando
- [ ] ✅ Controle financeiro preciso
- [ ] ✅ Exportações CSV/PDF funcionando
- [ ] ✅ RBAC implementado e testado
- [ ] ✅ Busca global funcional

### Negócio
- [ ] ✅ Tempo de criação de evento < 2 min
- [ ] ✅ Relatório financeiro instantâneo
- [ ] ✅ Sistema utilizável em mobile
- [ ] ✅ Backup automático configurado

---

## Próximos Passos Imediatos

1. **Aprovar este planejamento**
2. **Iniciar Fase 1: Correções Críticas**
3. **Validar protótipo de Eventos antes de avançar**
4. **Revisar e ajustar cronograma a cada fase**

---

## Observações

- Este planejamento é **incremental**: cada fase entrega valor
- Priorize **funcionalidade sobre perfeição** nas primeiras fases
- Mantenha **commits pequenos e frequentes**
- Teste **cada feature antes de avançar**
- Documente **decisões técnicas importantes**

---

**Última atualização:** 2025-10-06
**Versão:** 1.0
