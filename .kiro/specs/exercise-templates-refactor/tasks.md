# Implementation Plan: Exercise Templates Refactor

## Overview

Refatoração incremental da aba "Templates" em `/exercises?tab=templates`. O plano segue a ordem: banco de dados → seed → API → store → componentes → fluxos → testes. Cada etapa constrói sobre a anterior, garantindo que nenhum código fique órfão.

## Tasks

- [x] 1. Migração de banco de dados
  - [x] 1.1 Criar migration Drizzle para alterar `exercise_templates`
    - Adicionar colunas `template_type`, `patient_profile`, `source_template_id`, `is_draft`, `exercise_count` à tabela existente
    - Criar índices `idx_exercise_templates_type`, `idx_exercise_templates_profile`, `idx_exercise_templates_org`
    - Arquivo: `functions/src/db/migrations/XXXX_exercise_templates_refactor.sql`
    - _Requirements: 1.1, 5.1, 5.4_

  - [x] 1.2 Criar migration para tabela `exercise_template_categories`
    - Criar tabela lookup com colunas `id`, `label`, `icon`, `order_index`
    - Inserir os 5 registros de perfil (ortopedico, esportivo, pos_operatorio, prevencao, idosos)
    - _Requirements: 1.1, 1.3_

  - [x] 1.3 Criar migration para trigger `trg_template_exercise_count`
    - Implementar função `update_template_exercise_count()` em PL/pgSQL
    - Criar trigger AFTER INSERT OR DELETE em `exercise_template_items`
    - _Requirements: 1.5_

  - [x] 1.4 Atualizar schema Drizzle (`functions/src/db/schema.ts`)
    - Adicionar novos campos ao objeto `exerciseTemplates`
    - Criar objeto `exerciseTemplateCategories`
    - Exportar novos tipos inferidos
    - _Requirements: 1.1, 5.1_

- [x] 2. Seed dos System Templates
  - [x] 2.1 Criar script de seed `functions/src/seed/exercise-templates.ts`
    - Implementar os 15 System_Templates com `template_type = 'system'`, `organization_id = NULL`
    - Cobrir todos os 5 perfis: Ortopédico (5), Esportivo (3), Pós-operatório (4), Prevenção (3), Idosos (3)
    - Incluir `evidence_level`, `condition_name`, `template_variant`, `patient_profile` para cada template
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 2.2 Criar Cloud Function admin para executar o seed
    - Endpoint protegido por role `admin` em `functions/src/api/admin/seed-templates.ts`
    - Verificar existência antes de inserir (idempotente)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Checkpoint — Verificar migrations e seed
  - Garantir que as migrations rodam sem erro (`pnpm db:push`)
  - Garantir que o seed é idempotente (pode ser executado múltiplas vezes)
  - Perguntar ao usuário se há dúvidas antes de prosseguir.

- [x] 4. Atualizar tipos TypeScript e API client
  - [x] 4.1 Estender `ExerciseTemplate` em `src/types/workers.ts`
    - Adicionar campos `templateType`, `patientProfile`, `sourceTemplateId`, `isDraft`, `exerciseCount`
    - Adicionar tipo `PatientProfileCategory`
    - _Requirements: 1.5, 5.1, 5.4_

  - [x] 4.2 Atualizar `useExerciseTemplates` hook (`src/hooks/useExerciseTemplates.ts`)
    - Adicionar parâmetros de filtro: `patientProfile`, `templateType`, `isDraft`
    - Atualizar query key para `['templates', { patientProfile, templateType, q }]`
    - Adicionar `staleTime: 1000 * 60 * 30` para query de categorias
    - _Requirements: 1.2, 1.4, 1.6_

  - [x] 4.3 Adicionar novos parâmetros de query ao endpoint GET `/api/templates`
    - Filtrar por `patientProfile`, `templateType`, `isDraft` no Cloud Function
    - Retornar `system` templates com `organization_id IS NULL`
    - Retornar `custom` templates com `organization_id = ctx.organizationId`
    - Arquivo: `functions/src/api/templates.ts` (ou equivalente existente)
    - _Requirements: 1.2, 7.2, 11_

  - [x] 4.4 Implementar endpoint POST `/api/templates/:id/apply`
    - Validar template ativo (`is_active = true`, `is_draft = false`)
    - Criar `exercise_plans` e copiar `exercise_template_items` para `exercise_plan_items`
    - Retornar `{ planId, patientId, exerciseCount }`
    - _Requirements: 3.5, 3.6_

  - [x] 4.5 Implementar endpoint POST `/api/templates/:id/customize`
    - Validar que template fonte é `template_type = 'system'`
    - Criar novo template com `template_type = 'custom'`, `source_template_id = id`
    - Copiar todos os `exercise_template_items`
    - _Requirements: 5.2, 5.3_

  - [x] 4.6 Escrever testes de propriedade para lógica de filtro da API
    - **Property 11: System_Templates sempre visíveis independentemente de Custom_Templates**
    - **Validates: Requirements 7.2**

- [x] 5. Zustand Store `useTemplateUIStore`
  - [x] 5.1 Criar `src/stores/useTemplateUIStore.ts`
    - Implementar estado: `selectedTemplateId`, `activeProfile`, `searchQuery`, `applyFlowOpen`, `createFlowOpen`, `createFlowSourceId`
    - Implementar actions: `setSelectedTemplate`, `setActiveProfile`, `setSearchQuery`, `openApplyFlow`, `closeApplyFlow`, `openCreateFlow`, `closeCreateFlow`
    - _Requirements: 1.2, 1.6, 3.1, 4.1_

  - [x] 5.2 Escrever testes unitários para `useTemplateUIStore`
    - Testar transições de estado para cada action
    - Testar que `closeCreateFlow` reseta `createFlowSourceId`
    - _Requirements: 4.1, 5.2_

- [x] 6. Componente `TemplateCard` (refatorado)
  - [x] 6.1 Refatorar `TemplateCard` dentro de `src/components/exercises/TemplateManager.tsx`
    - Exibir badge "Sistema" para `templateType = 'system'` e "Personalizado" para `'custom'`
    - Exibir `exerciseCount`, `conditionName`, `evidenceLevel` (quando não nulo)
    - Aplicar estilo `isSelected` (borda destacada)
    - _Requirements: 1.5, 5.4_

  - [x] 6.2 Escrever testes de propriedade para `TemplateCard`
    - **Property 3: Renderização de card contém todas as informações obrigatórias**
    - **Validates: Requirements 1.5**
    - **Property 9: Badges distintos por tipo de template**
    - **Validates: Requirements 5.1, 5.4**
    - Arquivo: `src/components/exercises/TemplateCard.test.tsx`

- [x] 7. Componente `TemplateSidebar`
  - [x] 7.1 Criar `src/components/exercises/TemplateSidebar.tsx`
    - Implementar `ProfileFilterTabs` com os 5 perfis + "Todos" e contador por perfil
    - Implementar campo de busca com debounce de 300ms
    - Renderizar lista de `TemplateCard` com estado de loading (skeleton) e estado vazio
    - Botão "Criar Template" visível no topo
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 4.1_

  - [x] 7.2 Escrever testes de propriedade para filtro por perfil
    - **Property 1: Filtro por perfil retorna apenas templates do perfil selecionado**
    - **Validates: Requirements 1.2, 1.4**
    - **Property 2: Busca retorna subconjunto relevante**
    - **Validates: Requirements 1.6**
    - Arquivo: `src/components/exercises/TemplateSidebar.test.tsx`

- [x] 8. Componente `TemplateDetailPanel`
  - [x] 8.1 Criar `src/components/exercises/TemplateDetailPanel.tsx` (substitui `TemplateDetailsModal`)
    - Exibir nome, badges de tipo e evidência no topo
    - Botão "Aplicar a Paciente" sempre visível (sticky ou no topo)
    - Botão "Personalizar" apenas para `templateType = 'system'`
    - Botões "Editar" e "Excluir" apenas para `templateType = 'custom'`
    - Tabs: Exercícios | Clínico | Contraindicações | Progressão | Referências
    - Estado vazio quando `exerciseCount = 0`
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 5.1_

  - [x] 8.2 Implementar `ExerciseTimeline` para templates pós-operatório
    - Exibir progressão por semanas (linha do tempo ou tabela de fases)
    - Renderizar apenas quando `patientProfile = 'pos_operatorio'`
    - _Requirements: 2.4_

  - [x] 8.3 Escrever testes de propriedade para renderização condicional
    - **Property 4: Renderização condicional por perfil pós-operatório**
    - **Validates: Requirements 2.4, 3.4, 4.6**
    - Arquivo: `src/components/exercises/TemplateDetailPanel.test.tsx`

  - [x] 8.4 Escrever testes unitários para `TemplateDetailPanel`
    - Testar estado vazio quando `exerciseCount = 0`
    - Testar ausência do botão "Personalizar" para `Custom_Template`
    - Testar exibição de timeline apenas para `pos_operatorio`
    - _Requirements: 2.4, 2.6, 5.1_

- [x] 9. Refatorar `TemplateManager` para layout split-view
  - [x] 9.1 Refatorar `src/components/exercises/TemplateManager.tsx`
    - Substituir layout atual por split-view: `TemplateSidebar` (esquerda) + `TemplateDetailPanel` (direita)
    - Conectar ao `useTemplateUIStore` para estado de seleção e filtros
    - Em telas `< lg`: painel de detalhes substitui a lista (navegação back/forward)
    - Exibir estado vazio com CTA quando não há Custom_Templates (mas System_Templates sempre visíveis)
    - _Requirements: 1.1, 2.1, 7.1, 7.2, 7.3, 7.4_

  - [x] 9.2 Escrever testes de propriedade para visibilidade de System_Templates
    - **Property 11: System_Templates sempre visíveis independentemente de Custom_Templates**
    - **Validates: Requirements 7.2**
    - Arquivo: `src/components/exercises/TemplateManager.test.tsx`

- [x] 10. Checkpoint — Verificar layout split-view
  - Garantir que todos os testes de componente passam
  - Verificar responsividade em telas `< lg`
  - Perguntar ao usuário se há ajustes de layout antes de prosseguir.

- [x] 11. Fluxo `TemplateApplyFlow`
  - [x] 11.1 Criar `src/components/exercises/TemplateApplyFlow.tsx`
    - Sheet lateral com etapa 1: busca de paciente por nome/CPF (combobox com debounce 300ms)
    - Etapa 2: seleção de data de início
    - Etapa 3 (condicional): vinculação a cirurgia — apenas para `patientProfile = 'pos_operatorio'`
    - Chamar `POST /api/templates/:id/apply` via `useMutation`
    - Em sucesso: toast com link para o plano criado + `invalidate(['exercise-plans', patientId])`
    - Em erro: toast descritivo, Sheet permanece aberta com dados preservados
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 11.2 Escrever testes de propriedade para `TemplateApplyFlow`
    - **Property 5: Aplicação de template cria plano com exercícios corretos**
    - **Validates: Requirements 3.5**
    - **Property 10: Preservação de estado do formulário em caso de erro**
    - **Validates: Requirements 3.7, 8.4**
    - Arquivo: `src/components/exercises/TemplateApplyFlow.test.tsx`

  - [x] 11.3 Escrever testes unitários para `TemplateApplyFlow`
    - Testar exibição da etapa de cirurgia apenas para `pos_operatorio`
    - Testar que formulário mantém dados após erro de API
    - _Requirements: 3.4, 3.7_

- [x] 12. Fluxo `TemplateCreateFlow`
  - [x] 12.1 Criar `src/components/exercises/TemplateCreateFlow.tsx` (substitui `TemplateModal`)
    - Dialog multi-step com 3 etapas: (1) Informações básicas, (2) Exercícios, (3) Informações clínicas
    - Etapa 1: campos `name` (obrigatório), `patientProfile` (obrigatório), `conditionName` (obrigatório), `templateVariant`
    - Etapa 2: busca e adição de exercícios da biblioteca; campos `sets`, `reps`, `duration`; campos `week_start`/`week_end` condicionais para `pos_operatorio`
    - Etapa 3: `clinicalNotes`, `contraindications`, `precautions`, `progressionNotes`, `evidenceLevel`, `bibliographicReferences`
    - Suporte a modo "personalizar" (pré-preenchido via `sourceTemplate`)
    - Botão "Salvar como Rascunho" (`isDraft = true`)
    - Validação Zod: rejeitar submissão se `name`, `patientProfile` ou `conditionName` ausentes/brancos
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.2, 5.3_

  - [x] 12.2 Escrever testes de propriedade para validação do formulário
    - **Property 12: Validação de campos obrigatórios no formulário de criação**
    - **Validates: Requirements 4.3**
    - Arquivo: `src/components/exercises/TemplateCreateFlow.test.tsx`

  - [x] 12.3 Escrever testes unitários para `TemplateCreateFlow`
    - Testar exibição de campos de semana apenas quando `patientProfile = 'pos_operatorio'`
    - Testar modo "personalizar" pré-preenche campos corretamente
    - _Requirements: 4.6, 5.2_

- [x] 13. Proteção de System_Templates
  - [x] 13.1 Implementar bloqueio de exclusão de System_Templates
    - No `TemplateDetailPanel`: botão "Excluir" ausente para `templateType = 'system'`
    - No Cloud Function DELETE `/api/templates/:id`: retornar 403 se `template_type = 'system'`
    - AlertDialog de confirmação para Custom_Templates informa se há planos ativos vinculados
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 13.2 Implementar bloqueio de edição direta de System_Templates
    - Ao tentar editar System_Template: toast informativo + oferta de "Personalizar"
    - _Requirements: 5.5_

  - [x] 13.3 Escrever testes de propriedade para proteção de System_Templates
    - **Property 7: System_Templates não podem ser excluídos**
    - **Validates: Requirements 8.1**
    - **Property 6: Personalizar System_Template não modifica o original**
    - **Validates: Requirements 5.3**
    - Arquivo: `src/components/exercises/TemplateProtection.test.tsx`

- [x] 14. Consistência do `exercise_count`
  - [x] 14.1 Escrever testes de propriedade para consistência de `exercise_count`
    - **Property 8: Contagem de exercícios é consistente com os items**
    - **Validates: Requirements 1.5**
    - Arquivo: `src/components/exercises/ExerciseCount.test.tsx`

- [x] 15. Integração final e wiring
  - [x] 15.1 Integrar `TemplateApplyFlow` e `TemplateCreateFlow` no `TemplateManager`
    - Conectar `openApplyFlow()` e `openCreateFlow(sourceId?)` do store aos componentes
    - Garantir que `onSuccess` de cada fluxo invalida as queries corretas
    - Remover `TemplateModal` e `TemplateDetailsModal` (substituídos)
    - _Requirements: 3.1, 4.1, 5.2_

  - [x] 15.2 Atualizar `src/components/exercises/index.ts`
    - Exportar novos componentes: `TemplateSidebar`, `TemplateDetailPanel`, `TemplateApplyFlow`, `TemplateCreateFlow`
    - Remover exports de `TemplateModal` e `TemplateDetailsModal`
    - _Requirements: todos_

- [x] 16. Testes E2E (Playwright)
  - [x] 16.1 Escrever teste E2E: fluxo completo de aplicação de template
    - Selecionar template → aplicar a paciente → verificar plano criado no perfil
    - Arquivo: `e2e/exercise-templates/apply-flow.spec.ts`
    - _Requirements: 3.1, 3.5, 3.6_

  - [x] 16.2 Escrever teste E2E: fluxo de personalização
    - System_Template → Personalizar → verificar novo Custom_Template na listagem
    - Arquivo: `e2e/exercise-templates/customize-flow.spec.ts`
    - _Requirements: 5.2, 5.3_

  - [x] 16.3 Escrever teste E2E: estado vazio e onboarding
    - Organização sem Custom_Templates exibe System_Templates e CTAs corretos
    - Arquivo: `e2e/exercise-templates/empty-state.spec.ts`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 17. Checkpoint final — Garantir que todos os testes passam
  - Executar `pnpm test:unit` e verificar que todos os testes passam
  - Verificar que nenhum código órfão permanece (TemplateModal, TemplateDetailsModal removidos)
  - Perguntar ao usuário se há ajustes finais antes de considerar a feature completa.

## Notes

- Tasks marcadas com `*` são opcionais e podem ser puladas para MVP mais rápido
- Cada task referencia requirements específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Property tests validam propriedades universais de corretude (12 properties do design)
- Unit tests validam casos específicos e condições de borda
- A ordem das tasks garante que nenhum código fique órfão: DB → seed → API → store → componentes → fluxos → integração
