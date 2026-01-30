# Planejamento de Conclusão do Perfil do Paciente

## 1. Análise Situacional

### Estado Atual
- A página `PatientProfilePage.tsx` está funcional mas apresenta inconsistências de tipos.
- Existem componentes avançados como `PatientDashboard360.tsx` que não estão sendo utilizados na visualização principal.
- **Problema Crítico:** Incompatibilidade entre os tipos do TypeScript/Zod (camelCase: `birthDate`, `name`) e o retorno do Banco de Dados/Supabase (snake_case: `birth_date`, `full_name`).

### Objetivos
1.  **Unificar Tipagem:** Ajustar as interfaces para suportar o formato do banco de dados (snake_case) que é o que está sendo retornado pelas queries.
2.  **Melhorar UX:** Substituir a visualização básica da aba "Visão Geral" pelo componente `PatientDashboard360` que é mais rico.
3.  **Corrigir Erros:** Eliminar os erros de TypeScript relatados.
4.  **Integração Total:** Garantir que todas as abas (Financeiro, Gamificação, Documentos) recebam os dados corretos.

## 2. Estratégia de Implementação

### Fase 1: Padronização de Tipos (`src/types/index.ts`)
- Atualizar a interface `Patient` para incluir explicitamente as propriedades em snake_case (`birth_date`, `full_name`, `created_at`, etc.) que vêm do banco.
- Isso evitará o uso de `as any` e erros de propriedade indefinida.

### Fase 2: Integração do Dashboard 360
- Editar `src/pages/patients/PatientProfilePage.tsx`.
- Importar `PatientDashboard360`.
- Substituir o conteúdo atual da `OverviewTab` pelo `PatientDashboard360`.
- Garantir que as props passadas correspondam à interface atualizada.

### Fase 3: Refinamento das Abas
- **Dados Pessoais:** Verificar se `PersonalDataTab` está mapeando corretamente campos como `emergency_contact`.
- **Financeiro/Documentos:** Garantir que o `patientId` está sendo passado corretamente.

### Fase 4: Verificação
- Executar verificação de tipos (`tsc`).
- Verificar se não há regressão nas funcionalidades de Edição e Avaliação.

## 3. Plano de Ação Detalhado

| ID | Tarefa | Descrição | Status |
|----|--------|-----------|--------|
| T1 | Atualizar Tipos | Editar `src/types/index.ts` para suportar snake_case no `Patient`. | Concluído |
| T2 | Refatorar Overview | Implementar `PatientDashboard360` na aba "Visão Geral". | Concluído |
| T3 | Corrigir ProfilePage | Ajustar extração de dados em `PatientProfilePage.tsx` para usar tipos seguros. | Concluído |
| T4 | Validar Gamificação | Verificar se `GamificationTab` recebe os dados corretos. | Concluído (via T3) |
| T5 | Teste de Build | Executar `tsc` para garantir zero erros na página. | Concluído |

## 4. Agentes e Recursos
- **Frontend Specialist:** Responsável pela implementação React e ajustes de UI.
- **Codebase Investigator:** Responsável por verificar referências cruzadas.

---
**Status:** Concluído com Sucesso.

