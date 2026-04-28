# Implementation Plan: Patient Follow-Up Dashboard Page

**Branch**: `new-page-example` | **Date**: 2026-04-27 | **Spec**: `specs/new-page-example/spec.md`
**Input**: Feature specification from `specs/new-page-example/spec.md`

## Summary
Implementar uma nova página de acompanhamento de pacientes no web dashboard do FisioFlow. A página deve consolidar próximos atendimentos, status de home exercise programs e ações de lembrete em uma visão única.

## Technical Context

**Language/Version**: TypeScript 5.7, React 19, Next.js 16
**Primary Dependencies**: `@fisioflow/ui` (ou `packages/ui`), React Query, Hono API, Tailwind CSS
**Storage**: fetch de dados via `apps/api` para clientes web.
**Testing**: Vitest para componentes e testes de integração UI; Playwright para fluxo de página.
**Target Platform**: Web dashboard (`apps/web`)
**Project Type**: Feature page dentro do monorepo web
**Performance Goals**: carregamento inicial < 500ms em dev local e carregamento incremental via cache de consulta.
**Constraints**: reutilizar componentes e garantir tenant isolation sem criar APIs novas desnecessárias.

## Constitution Check
- Mantém o padrão spec-driven para novos recursos.
- Usa a pilha existente de web e API do monorepo.
- Respeita isolamento de dados por organização.
- Segue a política de documentação e processos do `constitution.md`.

## Project Structure

### Documentation
```text
specs/new-page-example/
  spec.md
  plan.md
  tasks.md
```

### Implementation Outline
```text
apps/web/src/pages/follow-up.tsx
apps/web/src/components/follow-up/
  follow-up-page.tsx
  follow-up-card.tsx
packages/ui/src/components/card/follow-up-card.tsx
apps/api/src/routes/follow-up.ts
apps/api/src/services/follow-up-service.ts
apps/web/src/hooks/useFollowUpData.ts
```

**Structure Decision**: A funcionalidade será adicionada ao frontend web usando a arquitetura de páginas/rotas existente do Next.js. Os dados serão consumidos por uma rota de API backend reutilizando serviços já existentes.

## Implementation Approach
1. Criar `apps/web/src/pages/follow-up.tsx` e componentizar a interface.
2. Reutilizar componentes de lista e cartão do design system compartilhado.
3. Criar hook `useFollowUpData` para buscar informações de pacientes e planos.
4. Adicionar endpoint backend em `apps/api` se necessário para pré-processar dados.
5. Validar comportamento com testes de componente e fluxo.

## Validation
- Confirmação manual da navegação para a nova página e exibição de dados.
- Testes automatizados de componente e fluxo de filtro.
- Revisão do PR para garantir que o novo recurso utiliza `specs/` e respeita tenant isolation.
