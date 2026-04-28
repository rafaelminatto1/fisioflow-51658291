# Feature Specification: Patient Follow-Up Dashboard Page

**Feature Branch**: `new-page-example`  
**Created**: 2026-04-27  
**Status**: Draft  
**Input**: User description: "Create a new dashboard page in the web application for patient follow-up, showing upcoming appointments, active home exercise programs, and quick actions for reminders."

## User Scenarios & Testing

### User Story 1 - Follow-up page visibility (Priority: P1)
Como fisioterapeuta, quero ver uma página dedicada de acompanhamento de pacientes para que eu possa monitorar compromissos e exercícios em um único lugar.

**Why this priority**: O acompanhamento centralizado reduz tempo de navegação e melhora a qualidade do atendimento.

**Independent Test**: Abrir a nova página e validar que ela exibe uma lista de pacientes ativos com datas de próxima consulta e status de exercício.

**Acceptance Scenarios**:
1. **Given** um fisioterapeuta logado, **When** ele navega para o menu de acompanhamento, **Then** a página exibe pacientes com próximas consultas e planos ativos.
2. **Given** que não há lembretes agendados, **When** a página carrega, **Then** ela mostra uma mensagem amigável explicando como gerar lembretes.

---

### User Story 2 - Ações rápidas de lembrete (Priority: P2)
Como fisioterapeuta, quero enviar lembretes rápidos por WhatsApp ou SMS para pacientes com exercícios pendentes, para aumentar a adesão.

**Why this priority**: Mensagens rápidas mantêm os pacientes engajados e diminuem faltas.

**Independent Test**: Usar o botão de lembrete para abrir o fluxo de mensagem e confirmar que a ação dispara o evento correto.

**Acceptance Scenarios**:
1. **Given** um paciente com plano de exercícios ativo, **When** eu clico em "Enviar lembrete", **Then** a interface deve abrir opções de mensagem.
2. **Given** um paciente sem plano ativo, **When** eu vejo a linha do paciente, **Then** o botão de lembrete deve estar desabilitado ou oculto.

---

### User Story 3 - Filtros de prioridade (Priority: P3)
Como fisioterapeuta, quero filtrar pacientes por urgência e tipo de plano, para priorizar quem precisa de atenção imediata.

**Why this priority**: Ajuda a organizar o trabalho diário sem precisar buscar dados em várias telas.

**Independent Test**: Aplicar um filtro e verificar que os resultados atualizados refletem apenas pacientes relevantes.

**Acceptance Scenarios**:
1. **Given** vários pacientes listados, **When** eu apico o filtro por "agenda próxima", **Then** apenas pacientes com consultas nos próximos 7 dias aparecem.
2. **Given** um filtro ativo, **When** eu removo o filtro, **Then** a lista retorna ao estado completo.

---

### Edge Cases
- Pacientes sem próxima consulta devem aparecer com um estado de "Agendamento pendente".
- Se a API retornar erro, a página deve exibir uma mensagem de falha e um botão para recarregar.
- O acesso à página deve respeitar a autorização do usuário: somente profissionais com permissão de atendimento podem visualizar.

## Requirements

### Functional Requirements
- **FR-001**: A página deve ser acessível a partir do menu principal do web dashboard.
- **FR-002**: Deve mostrar pacientes com próximo compromisso, status de exercícios e botão de lembrete.
- **FR-003**: Deve usar dados da API existente sem criar uma nova origem de verdade.
- **FR-004**: Deve ter suporte mobile responsivo para desktop e tablet.
- **FR-005**: Todo acesso de dados deve respeitar tenant isolation e a organização do usuário.

### Key Entities
- **Patient**: paciente com `id`, `name`, `nextAppointmentAt`, `exercisePlanStatus`.
- **FollowUpCard**: item de UI que representa cada paciente e suas ações rápidas.
- **ReminderAction**: ação para enviar mensagem ou sinalizar pendência.

## Success Criteria

### Measurable Outcomes
- **SC-001**: A nova página pode ser aberta em menos de 2 cliques a partir do dashboard.
- **SC-002**: O tempo de carregamento inicial da página deve ser inferior a 500ms localmente.
- **SC-003**: A ação de lembrete deve estar disponível para pelo menos 80% dos pacientes ativos.
- **SC-004**: A página deve ser responsiva e acessível em telas de 1024px e 768px.

## Assumptions
- A API já expõe os dados de paciente e exercícios no backend existente.
- O design deve reutilizar componentes de `packages/ui` e `apps/web`.
- A página não precisa implementar envio real de WhatsApp/SMS neste MVP; botão pode acionar fluxo interno.
- A experiência deve ser compatível com o padrão de navegação actual do dashboard.
