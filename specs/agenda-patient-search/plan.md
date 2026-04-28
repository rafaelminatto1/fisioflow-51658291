# Implementation Plan: Agenda Patient Quick Search + Therapist Filter

**Branch**: `agenda-patient-search` | **Date**: 2026-04-28 | **Spec**: `specs/agenda-patient-search/spec.md`
**Input**: Feature specification from `specs/agenda-patient-search/spec.md`

## Summary

Melhorar a página de agenda do web dashboard adicionando: 1) um campo de pesquisa por paciente no toolbar, 2) um filtro de terapeutas no modal de filtros avançados, e 3) persistência desses estados na URL.

## Technical Context

- **Target**: `apps/web` agenda principal.
- **Language/Version**: TypeScript 5.x, React 19, React Router, Tailwind CSS.
- **Data**: `useSchedulePageData` já expõe pacientes, terapeutas e agenda; o filtro de paciente já é aplicado no frontend.
- **Dependencies**: `@tanstack/react-query`, `date-fns`, `react-router-dom`, `lucide-react`, componentes UI existentes.
- **Testing**: Vitest para componentes, Playwright para fluxo de agenda e URL.

## Implementation Outline

### 1. Ajustar o estado da página de agenda
- Confirmar que `Schedule.tsx` mantém `patient` nos search params.
- Garantir que `handlePatientFilterChange` atualiza corretamente `patient` no URL e limpa o parâmetro quando vazio.
- Expor `patientFilter` e `onPatientFilterChange` para `ScheduleCalendar`.

### 2. Adicionar campo de pesquisa no toolbar
- Atualizar `ScheduleToolbar.tsx` para renderizar um input de pesquisa por paciente.
- O campo deve ser sempre visível na versão desktop e tablet, e opcional via botão no mobile.
- Deve ser possível limpar o campo com um botão dentro do input.
- Focar o campo ao usar o atalho de teclado existente (`s` / `Ctrl+F` ou similar se já suportado).

### 3. Estender filtros de terapeuta
- Atualizar `AdvancedFilters.tsx` para aceitar um array `therapists` e renderizar como opções selecionáveis.
- Cada terapeuta deve exibir nome completo e manter seleção múltipla.
- Garantir que as opções de terapeuta aparecem apenas depois dos terapeutas carregados.
- Atualizar o texto do botão de filtros para refletir filtros ativos.

### 4. Garantir sincronização com URL e estado
- Confirmar que os parâmetros `patient` e `therapists` são preservados ao alternar data e view.
- Validar que links copiados/restaurados restauram os filtros corretamente.
- Tratar valores inválidos ou outdated no search param de forma segura.

### 5. Testes e validação
- Escrever testes de unidade para o campo de pesquisa e a seleção de terapeutas.
- Adicionar um teste de integração Playwright que aplica filtros, copia a URL e verifica a restauração.
- Testar manualmente em desktop e mobile.

## Project Structure

```text
apps/web/src/pages/Schedule.tsx
apps/web/src/components/schedule/ScheduleToolbar.tsx
apps/web/src/components/schedule/AdvancedFilters.tsx
apps/web/src/components/schedule/ScheduleCalendar.tsx
apps/web/src/hooks/useSchedulePage.ts
``` 

## Validation

- Navegar para a agenda e confirmar que o campo de pesquisa aparece.
- Confirmar que digitar o nome do paciente filtra imediatamente a agenda.
- Confirmar que terapeutas selecionados no modal atualizam a grade de eventos.
- Confirmar que a URL contém `patient` e `therapists` e restaura o estado ao recarregar.
- Executar testes automatizados para garantir regressão mínima.
