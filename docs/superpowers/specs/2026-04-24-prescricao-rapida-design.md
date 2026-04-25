# Design Spec: Prescrição Rápida (HEP - Home Exercise Program)

## 1. Visão Geral

Este design visa aumentar a eficiência do terapeuta no FisioFlow, reduzindo o tempo de criação de prescrições de exercícios (HEP) através de uma interface de "Prateleira de Exercícios" baseada em histórico de uso e favoritos.

## 2. Componentes Principais

- **ExerciseShelf**: Componente central de layout que contém a prateleira de exercícios.
- **ExerciseCard**: Card visual com miniatura, título e botões de ação rápida.
- **ActivePrescriptionList**: Painel lateral (ou área de drop) onde os exercícios selecionados são compilados.

## 3. Arquitetura e Data Flow

- **State Management**: Utilizaremos a store `Zustand` existente para gerenciar o estado da `activePrescription`.
- **Drag & Drop**: Implementação utilizando uma biblioteca leve (ex: `@dnd-kit/core`) para arrastar cards da biblioteca para a lista ativa.
- **Personalização**: O sistema irá rastrear (via backend ou localstorage inicialmente) os exercícios mais prescritos pelo terapeuta (campo `prescricao_frequencia`) para preencher automaticamente a prateleira.

## 4. UX e Design

- **Filtros**: Sidebar com acesso a:
  - Favoritos do terapeuta.
  - Top 10 mais utilizados no FisioFlow.
  - Categorias por patologia/região corporal.
- **Workflow**:
  1. Terapeuta filtra ou busca o exercício.
  2. Arrastar o card para o painel de prescrição.
  3. (Opcional) Reordenar a lista ativa via drag-and-drop.
  4. Salvar prescrição.

## 5. Próximos Passos (Implementação)

- Após a aprovação deste spec, será criado um plano de implementação para refatorar o componente de seleção atual.
