# Feature Specification: Agenda Patient Quick Search + Therapist Filter

**Feature Branch**: `agenda-patient-search`
**Created**: 2026-04-28
**Status**: Draft
**Input**: Improve the schedule page by adding a visible patient search input and a therapist filter to the agenda toolbar/modal.

## User Scenarios & Testing

### User Story 1 - Patient search on agenda (Priority: P1)
Como fisioterapeuta, quero buscar rapidamente um paciente pela agenda para encontrar consultas relacionadas sem precisar percorrer o calendário manualmente.

**Why this priority**: O acesso rápido ao paciente reduz cliques e acelera a confirmação ou edição de consultas.

**Independent Test**: Digitar parte do nome do paciente na barra de pesquisa e verificar que os eventos exibidos atualizam imediatamente.

**Acceptance Scenarios**:
1. **Given** um profissional na agenda, **When** ele digita "João" no campo de busca, **Then** a agenda deve mostrar apenas agendamentos com pacientes cujo nome contenha "João".
2. **Given** um filtro ativo, **When** ele limpa o texto de pesquisa, **Then** todos os compromissos visíveis devem retornar sem o filtro de paciente.

---

### User Story 2 - Filtrar por terapeuta (Priority: P2)
Como fisioterapeuta, quero filtrar a agenda por terapeuta para ver apenas os horários de um profissional ou equipe específica.

**Why this priority**: Clínicas com várias agendas precisam dividir a visão por profissional para reduzir ruído e prevenir conflitos.

**Independent Test**: Abrir os filtros avançados, selecionar um ou mais terapeutas e confirmar que apenas os eventos desses terapeutas permanecem.

**Acceptance Scenarios**:
1. **Given** vários terapeutas disponíveis, **When** o usuário aplica o filtro por terapeuta, **Then** a agenda exibe somente consultas associadas a esses terapeutas.
2. **Given** um paciente e um terapeuta filtrados, **When** o filtro é limpo, **Then** a agenda retorna ao estado completo.

---

### User Story 3 - URL deep link para estado de filtro (Priority: P3)
Como membro da equipe, quero compartilhar um link de agenda com filtro aplicado para que o mesmo estado seja restaurado ao abrir a página.

**Why this priority**: Permite workflows de colaboração e evita que o usuário precise reaplicar filtros manualmente.

**Independent Test**: Copiar a URL com parâmetros `patient` e `therapists`, abrir em nova aba e validar que os filtros são carregados.

**Acceptance Scenarios**:
1. **Given** a agenda com filtros aplicados, **When** o usuário copia a URL e abre em outra sessão, **Then** a agenda deve restaurar paciente e terapeuta pelo query string.
2. **Given** parâmetros de filtro inválidos na URL, **When** a página carrega, **Then** os filtros devem ser ignorados de forma segura.

---

## Requirements

### Functional Requirements
- **FR-001**: Adicionar uma caixa de pesquisa por paciente diretamente no toolbar da agenda.
- **FR-002**: Adicionar seleção de terapeutas no modal de filtros avançados e incluí-los no estado de filtro da agenda.
- **FR-003**: A pesquisa por paciente deve atualizar o calendário em tempo real usando o estado de URL (`?patient=...`).
- **FR-004**: Os filtros de terapeuta devem ser persistidos na URL usando o parâmetro `therapists`.
- **FR-005**: Deve existir um controle claro para limpar filtros e pesquisa sem recarregar a página.
- **FR-006**: Respeitar o isolamento por organização e não expor dados além dos pacientes e terapeutas do tenant.

### Key Entities
- **ScheduleToolbar**: exibe controles de vista, navegação e pesquisa por paciente.
- **AdvancedFilters**: exibe opções de status, tipos e terapeutas com seleção múltipla e limpeza.
- **SchedulePageState**: mantém `patient`, `status`, `types` e `therapists` como query params.

## Success Criteria

### Measurable Outcomes
- **SC-001**: O campo de pesquisa por paciente aparece consistentemente no topo da página de agenda.
- **SC-002**: A lista de eventos da agenda responde ao filtro de paciente em menos de 300ms localmente.
- **SC-003**: Os terapeutas aparecem como opções no modal de filtros e podem ser aplicados simultaneamente.
- **SC-004**: A URL reflete o estado atual de pesquisa e filtros para compartilhamento.

## Assumptions
- O hook `useSchedulePageData` já suporta filtro de paciente no cliente e basta conectar o input de UI.
- A lista de terapeutas já é carregada pela agenda e pode ser usada para preencher o modal de filtros.
- Não é necessário alterar o backend para esse MVP; toda filtragem pode acontecer no frontend com dados já carregados.
- Navegação de teclado deve continuar funcionando com foco no input de pesquisa.
