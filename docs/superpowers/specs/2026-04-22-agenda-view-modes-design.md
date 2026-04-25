# Spec Técnica: Agenda com Visualizações Dia, Semana e Mês

## 1. Visão Geral

Atualmente a página [src/pages/Schedule.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/Schedule.tsx) força a agenda para a visualização semanal, mesmo com suporte já existente no calendário para `day`, `week` e `month`. O objetivo desta mudança é reabilitar as três visualizações na interface, manter `week` como padrão e preservar a data selecionada como âncora ao alternar entre os modos.

## 2. Objetivo

- Habilitar as visualizações `Dia`, `Semana` e `Mês` na agenda.
- Definir `Semana` como visualização padrão.
- Preservar a data de referência atual ao trocar entre os modos.
- Manter a experiência atual de filtros, CRUD, atalhos e navegação por data sem regressões funcionais.

## 3. Estado Atual

- A página [src/pages/Schedule.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/Schedule.tsx) fixa `viewParam = "week"` e também renderiza o calendário com `viewType="week"`.
- A toolbar [src/components/schedule/ScheduleToolbar.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/schedule/ScheduleToolbar.tsx) já conhece os tipos `day | week | month`, mas a UI foi reduzida para exibir apenas `Semana`.
- O calendário [src/components/schedule/DayFlowCalendar.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/schedule/DayFlowCalendar.tsx) já suporta:
  - `day -> timeGridDay`
  - `week -> timeGridWeek`
  - `month -> dayGridMonth`
- O carregamento de dados em [src/hooks/useSchedulePage.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/hooks/useSchedulePage.ts) já trata consultas por dia, semana e mês.

## 4. Escopo

### Incluído

- Ler `view` da URL na página da agenda.
- Validar `view` com aceitação de `day | week | month`.
- Aplicar fallback para `week` quando `view` estiver ausente ou inválido.
- Exibir `Dia`, `Semana` e `Mês` na toolbar desktop e mobile.
- Garantir que a mesma `viewType` seja usada na query de dados, skeleton e calendário renderizado.
- Preservar a data âncora atual ao alternar entre os modos.
- Validar comportamento por testes unitários ou de integração leves.

### Fora de Escopo

- Refatorar a arquitetura da agenda para usar [src/hooks/useScheduleState.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/hooks/useScheduleState.ts).
- Alterar CRUD, drag-and-drop, modais, filtros avançados ou seleção em massa.
- Criar novas rotas, novos parâmetros de URL ou persistência adicional em local storage.
- Redesenhar o layout da agenda além da reativação do seletor de visualização.

## 5. Abordagem Recomendada

### 5.1 Leitura e validação da view

Na página da agenda:

- Ler `searchParams.get("view")`.
- Aceitar apenas `day`, `week` e `month`.
- Em qualquer outro caso, usar `week`.

Regra de fallback:

- `?view=day` -> `day`
- `?view=week` -> `week`
- `?view=month` -> `month`
- `?view=<valor invalido>` -> `week`
- ausência de `view` -> `week`

### 5.2 Fonte única de verdade na página

A `viewType` validada será usada em todos os pontos abaixo:

- `useSchedulePageData(dateParam, viewType, filters)`
- `CalendarSkeletonEnhanced viewType`
- `DayFlowCalendarWrapper viewType`

Isso evita divergência entre toolbar, dados buscados e grade exibida.

### 5.3 Toolbar de visualização

Em [src/components/schedule/ScheduleToolbar.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/schedule/ScheduleToolbar.tsx):

- Desktop: mostrar três botões lado a lado para `Dia`, `Semana` e `Mês`.
- Mobile: manter a mesma capacidade de troca entre os três modos, sem esconder a visualização mensal.
- O estado ativo deve refletir `viewType`.
- O clique em um modo deve apenas chamar `onViewChange(view)`.

### 5.4 Preservação da data âncora

Ao alternar `day/week/month`, a data em `date` continua sendo a referência. Exemplo:

- `date=2026-04-22&view=week`
- troca para `month`
- resultado esperado: `date=2026-04-22&view=month`

O calendário e a busca de dados passam a interpretar o mesmo dia de referência segundo o modo selecionado.

## 6. Regras de Navegação

As regras atuais da toolbar permanecem, mas passam a respeitar o modo ativo:

- `day`: navegação por `-1` e `+1` dia
- `week`: navegação por `-7` e `+7` dias
- `month`: navegação por `-1` e `+1` mês
- `Hoje`: atualiza apenas a data para o dia atual, preservando a visualização ativa
- Date picker: altera `date`, preservando `view`

## 7. Comportamento Esperado

### 7.1 Cenários principais

1. Abrir `/agenda` sem query string:
   - agenda abre em `week`
   - data padrão é hoje

2. Abrir `/agenda?view=day&date=2026-04-22`:
   - agenda abre em `day`
   - data de referência é `2026-04-22`

3. Abrir `/agenda?view=month&date=2026-04-22`:
   - agenda abre em `month`
   - o mês exibido é o que contém `2026-04-22`

4. Abrir `/agenda?view=invalid&date=2026-04-22`:
   - agenda abre em `week`
   - data de referência continua `2026-04-22`

5. Trocar `week -> day -> month`:
   - a `date` na URL é mantida
   - apenas `view` muda

### 7.2 Comportamento de erro

- `date` inválida continua caindo para hoje, como já ocorre hoje.
- `view` inválida não quebra a renderização e cai para `week`.

## 8. Arquivos Impactados

- [src/pages/Schedule.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/Schedule.tsx)
  - remover a fixação manual em `week`
  - validar `view` da URL
  - propagar `viewType` validada para query, skeleton e calendário

- [src/components/schedule/ScheduleToolbar.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/schedule/ScheduleToolbar.tsx)
  - reabilitar os botões `Dia`, `Semana` e `Mês`
  - manter estado ativo coerente no desktop e mobile

### Impacto indireto esperado

- [src/components/schedule/DayFlowCalendar.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/schedule/DayFlowCalendar.tsx)
  - sem mudança estrutural obrigatória; deve apenas receber a `viewType` correta

- [src/hooks/useSchedulePage.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/hooks/useSchedulePage.ts)
  - sem mudança funcional obrigatória; já suporta consultas por dia, semana e mês

## 9. Estratégia de Validação

### 9.1 Cobertura mínima

Validar:

- `view=day`
- `view=week`
- `view=month`
- `view` inválida com fallback para `week`
- preservação de `date=2026-04-22` ao alternar os modos

### 9.2 Preferência de testes

- Reaproveitar cobertura existente quando útil, especialmente o padrão já presente em [src/components/schedule/**tests**/CalendarWeekView.test.tsx](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/schedule/__tests__/CalendarWeekView.test.tsx), que já valida troca de visualização em um componente relacionado.
- Se a cobertura existente não for suficiente para a página ou toolbar atuais, adicionar um teste pequeno e focado no contrato de URL + `viewType`.

## 10. Riscos e Mitigações

- **Risco:** Toolbar mudar o modo, mas a query de dados continuar semanal.
  - **Mitigação:** usar a mesma `viewType` validada como fonte única na página.

- **Risco:** O calendário continuar sempre em `week` por prop hardcoded.
  - **Mitigação:** remover `viewType="week"` e repassar a prop validada.

- **Risco:** Regressão em mobile por falta de espaço.
  - **Mitigação:** manter a solução visual simples, com os três modos acessíveis sem adicionar nova interação escondida.

## 11. Resultado Esperado

Ao final da implementação:

- a agenda permite alternar entre `Dia`, `Semana` e `Mês`;
- `Semana` continua sendo a visualização padrão;
- a data selecionada permanece estável ao trocar de modo;
- a UI e os dados carregados permanecem sincronizados;
- nenhuma funcionalidade lateral da agenda é alterada por esta entrega.
