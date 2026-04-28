# Feature Specification: Agenda Semanal com Cards de Agendamento Reformulados

**Branch**: `agenda-weekly-layout`  
**Created**: 2026-04-28  
**Status**: Draft  
**Input**: Redesenhar a página de agenda e os cards de agendamento com foco na visualização semanal, usando uma estética limpa e sofisticada.

## Objetivo
Como profissional de clínica, quero uma agenda semanal mais clara e visualmente sofisticada para identificar compromissos, confirmações e blocos de horário rapidamente.

## Cenários do Usuário

### Cenário 1 - Identificar a semana atual com rapidez
**Dado** que estou na página de agenda, **Quando** a página carrega, **Então** eu devo ver um cabeçalho semanal que informa o período de segunda a domingo com métricas principais.

### Cenário 2 - Visualizar compromissos de forma suave
**Dado** que existem vários agendamentos na semana, **Quando** eu vejo o calendário, **Então** cada compromisso deve aparecer com bordas arredondadas, texto legível e detalhes de horário facilmente identificáveis.

### Cenário 3 - Alternar entre dia, semana e mês mantendo o foco semanal
**Dado** que eu alterno para a visualização semanal, **Quando** não houver parâmetro `view` na URL, **Então** a agenda deve abrir no modo semana por padrão.

### Cenário 4 - Filtros e pesquisa permanecem acessíveis
**Dado** que uso o filtro de paciente ou status, **Quando** altero a semana, **Então** os controles de pesquisa e filtros permanecem visíveis e consistentes.

## Requisitos Funcionais
- **FR-001**: A agenda deve abrir em `week` por padrão quando o parâmetro `view` não estiver presente.
- **FR-002**: A página deve exibir um resumo semanal acima do calendário com métricas de agendamentos, confirmados, pendentes e grupos.
- **FR-003**: O calendário deve usar um layout clean no visual da semana, com cards de evento suaves e bordas arredondadas.
- **FR-004**: O toolbar deve continuar exibindo seleção `Dia / Semana / Mês`, mas a atenção principal deve ser na `Semana`.
- **FR-005**: O componente novo deve ser responsivo e manter legibilidade no desktop e tablet.

## Critérios de Sucesso
- **SC-001**: A semana atual é mostrada com período completo e métricas de agendamentos.
- **SC-002**: Os cards do calendário são mais suaves, com bordas arredondadas e dicas de horário legíveis.
- **SC-003**: A experiência de visualização semanal é responsiva, sem perda de funcionalidades do FullCalendar.
- **SC-004**: A implementação deve ser coberta por pelo menos um teste unitário simples para o novo componente de resumo.
