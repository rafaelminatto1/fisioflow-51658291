# Requirements Document

## Introduction

O FisioFlow precisa de um redesenho completo da UX/UI da página `/agenda/settings` — a central de configurações da agenda clínica, implementada em `src/pages/ScheduleSettings.tsx`. O trabalho envolve três frentes simultâneas:

1. **Completar a aparência por view**: o hook `useAgendaAppearance` já suporta configurações independentes por visualização (dia/semana/mês), mas a UI (`ScheduleVisualTab`) ainda opera globalmente via `useCardSize`.
2. **Redesenhar a arquitetura de abas**: as 6 abas atuais (Capacidade, Horários, Tipos de Atendimento, Políticas, Bloqueios, Aparência) precisam ser reavaliadas — algumas podem ser mescladas, reorganizadas ou promovidas a seções dentro de uma aba.
3. **Migrar persistência**: as configurações de aparência vivem em `localStorage`; precisam ser persistidas no **Neon PostgreSQL** via **Cloudflare Workers API** (Hono) para que o fisioterapeuta veja as mesmas configurações em qualquer dispositivo.

O resultado deve ser uma página de configurações coesa, rápida, visualmente polida e que reflita o padrão clínico/profissional do FisioFlow.

### Stack relevante

- **Frontend**: React 19 + React Router v7 + shadcn/ui + Tailwind CSS 4 (em `src/`)
- **Backend**: Cloudflare Workers com Hono (`apps/api/src/routes/`)
- **Banco**: Neon PostgreSQL serverless via Hyperdrive — ORM Drizzle (`packages/db/src/schema/`)
- **Auth**: Neon Auth — JWT verificado via JWKS; `profileId` e `organizationId` extraídos pelo middleware `requireAuth` em `apps/api/src/lib/auth.ts`
- **Testes**: Vitest + fast-check (property-based)

## Glossary

- **Settings_Page**: A página `/agenda/settings` — implementada em `src/pages/ScheduleSettings.tsx`.
- **Appearance_Hook**: O hook `useAgendaAppearance(view)` em `src/hooks/useAgendaAppearance.ts`.
- **View**: Uma das três visualizações da agenda — `day` (dia), `week` (semana) ou `month` (mês).
- **View_Preset**: Conjunto de valores de aparência (cardSize, heightScale, fontScale, opacity) pré-definido para uma View específica.
- **Global_Preset**: Conjunto de valores de aparência aplicado a todas as Views simultaneamente.
- **Appearance_Profile**: O objeto `AgendaAppearanceState` que contém o perfil global e os overrides por View, persistido no banco.
- **Settings_Tab**: Uma das seções navegáveis da Settings_Page (ex.: "Aparência", "Horários").
- **Persistence_Layer**: O serviço responsável por salvar e carregar o Appearance_Profile no **Neon PostgreSQL** via **Cloudflare Workers API** (Hono).
- **Optimistic_Update**: Atualização imediata da UI antes da confirmação do servidor, com rollback em caso de erro.
- **CardSize**: Enum de densidade dos cards de evento — `extra_small`, `small`, `medium`, `large`.
- **StatusColor**: Cor associada a um status de agendamento (ex.: agendado, confirmado, cancelado).
- **BusinessHours**: Configuração de horários de funcionamento por dia da semana.
- **BlockedTime**: Período de indisponibilidade registrado na agenda.
- **AppointmentType**: Tipo de atendimento com duração padrão e cor (ex.: Avaliação, Retorno).
- **SchedulePolicy**: Regra de negócio da agenda (ex.: antecedência mínima de cancelamento, política de no-show).
- **requireAuth**: Middleware Hono em `apps/api/src/lib/auth.ts` que verifica o JWT do Neon Auth e injeta `profileId`, `organizationId` e `role` no contexto da requisição.

---

## Requirements

### Requirement 1: Configurações de Aparência por Visualização

**User Story:** Como fisioterapeuta, quero configurar a aparência da agenda de forma independente para cada visualização (dia, semana, mês), para que cada view seja otimizada para o meu fluxo de trabalho.

#### Acceptance Criteria

1. WHEN o usuário acessa a aba "Aparência" da Settings_Page, THE Settings_Page SHALL exibir três painéis de configuração independentes, um para cada View (day, week, month).
2. WHEN o usuário ajusta o heightScale em um painel de View, THE Appearance_Hook SHALL atualizar apenas o override daquela View sem afetar as demais.
3. WHEN o usuário ajusta o fontScale em um painel de View, THE Appearance_Hook SHALL atualizar apenas o override daquela View sem afetar as demais.
4. WHEN o usuário ajusta o cardSize em um painel de View, THE Appearance_Hook SHALL atualizar apenas o override daquela View sem afetar as demais.
5. WHEN o usuário ajusta a opacity em um painel de View, THE Appearance_Hook SHALL atualizar apenas o override daquela View sem afetar as demais.
6. THE Settings_Page SHALL exibir uma pré-visualização ao vivo de cada View refletindo os valores configurados para aquela View.
7. WHEN o usuário clica em "Aplicar a todas as views", THE Appearance_Hook SHALL propagar os valores da View ativa para todas as demais Views via `applyToAllViews`.
8. WHEN o usuário clica em "Restaurar padrão" em um painel de View, THE Appearance_Hook SHALL remover o override daquela View, revertendo para os defaults sensatos definidos em `VIEW_DEFAULT_OVERRIDES`.
9. THE Settings_Page SHALL exibir um indicador visual quando uma View possui override ativo (diferente dos defaults).
10. WHERE o usuário seleciona um Global_Preset, THE Settings_Page SHALL aplicar o preset a todas as Views simultaneamente e exibir confirmação visual por 2 segundos.

---

### Requirement 2: Redesenho da Arquitetura de Abas

**User Story:** Como fisioterapeuta, quero uma navegação de configurações clara e sem redundâncias, para que eu encontre rapidamente o que preciso sem me perder em abas desnecessárias.

#### Acceptance Criteria

1. THE Settings_Page SHALL organizar as configurações em no máximo 5 Settings_Tabs, consolidando as 6 abas atuais.
2. THE Settings_Page SHALL manter a aba "Aparência" como seção dedicada contendo: configurações por View, Global_Presets, StatusColors e acessibilidade.
3. THE Settings_Page SHALL consolidar "Capacidade" e "Horários" em uma única aba "Agenda & Horários" com sub-seções internas.
4. THE Settings_Page SHALL manter "Tipos de Atendimento", "Políticas" e "Bloqueios" como abas independentes.
5. WHEN o usuário navega entre Settings_Tabs, THE Settings_Page SHALL preservar o estado não salvo da aba anterior até que o usuário navegue para fora da página.
6. THE Settings_Page SHALL sincronizar a aba ativa com o parâmetro de URL `?tab=` para permitir deep-linking.
7. WHEN o usuário acessa a Settings_Page em dispositivo móvel (viewport < 768px), THE Settings_Page SHALL exibir a navegação de abas como um Sheet lateral acionado por botão, mantendo o comportamento atual.
8. THE Settings_Page SHALL exibir um badge de contagem de itens nas abas "Bloqueios" e "Tipos de Atendimento" quando houver itens cadastrados.

---

### Requirement 3: Persistência do Appearance_Profile no Banco de Dados

**User Story:** Como fisioterapeuta, quero que minhas configurações de aparência da agenda sejam salvas na nuvem, para que eu veja as mesmas configurações em qualquer dispositivo ou navegador.

#### Acceptance Criteria

1. THE Persistence_Layer SHALL salvar o Appearance_Profile no **Neon PostgreSQL** via endpoint da Cloudflare Workers API (`PUT /api/v1/user/agenda-appearance`), implementado com Hono em `apps/api/src/routes/`.
2. THE Persistence_Layer SHALL carregar o Appearance_Profile do servidor no mount inicial do Appearance_Hook via endpoint (`GET /api/v1/user/agenda-appearance`).
3. WHEN o servidor retorna um Appearance_Profile, THE Appearance_Hook SHALL mesclar os dados do servidor com o estado local, priorizando o servidor.
4. WHEN o usuário altera qualquer configuração de aparência, THE Persistence_Layer SHALL executar um Optimistic_Update: atualizar o estado local imediatamente e enviar a requisição ao servidor em background.
5. IF a requisição de salvamento falhar, THEN THE Persistence_Layer SHALL reverter o estado local para o valor anterior e exibir uma notificação de erro via toast.
6. THE Persistence_Layer SHALL aplicar debounce de 800ms nas escritas ao servidor para evitar requisições excessivas durante ajuste de sliders.
7. WHEN o Appearance_Profile é carregado do servidor pela primeira vez, THE Appearance_Hook SHALL remover os dados legados do localStorage (`agenda_appearance_v2`, `agenda_card_size`, `agenda_card_height_multiplier`, `agenda_card_font_scale`, `agenda_card_opacity`).
8. THE Persistence_Layer SHALL associar o Appearance_Profile ao `profileId` do usuário autenticado (extraído do JWT Neon Auth pelo middleware `requireAuth`), garantindo isolamento multi-tenant por `organizationId`.
9. IF o servidor estiver indisponível no carregamento inicial, THEN THE Appearance_Hook SHALL usar o Appearance_Profile do localStorage como fallback e exibir um indicador de modo offline.
10. THE Persistence_Layer SHALL serializar e desserializar o Appearance_Profile em JSON; FOR ALL Appearance_Profiles válidos, serializar e depois desserializar SHALL produzir um objeto equivalente ao original (propriedade round-trip).

---

### Requirement 4: Melhoria Visual da Settings_Page

**User Story:** Como fisioterapeuta, quero que a página de configurações da agenda seja visualmente polida e consistente com o padrão do FisioFlow, para que a experiência de configuração seja agradável e profissional.

#### Acceptance Criteria

1. THE Settings_Page SHALL usar o sistema de design do FisioFlow (shadcn/ui + Tailwind CSS) de forma consistente em todos os componentes.
2. THE Settings_Page SHALL exibir um header com título, descrição e botão "Ver agenda" alinhados ao padrão atual.
3. WHEN o usuário passa o cursor sobre um Settings_Tab na sidebar, THE Settings_Page SHALL exibir uma transição visual suave (200ms) de highlight.
4. THE Settings_Page SHALL exibir um indicador de carregamento (skeleton ou spinner) enquanto os dados do servidor são carregados.
5. WHEN uma configuração é salva com sucesso, THE Settings_Page SHALL exibir uma confirmação visual discreta (toast de sucesso ou indicador inline) por no máximo 3 segundos.
6. THE Settings_Page SHALL suportar modo escuro (dark mode) em todos os componentes, usando as variáveis CSS do tema do FisioFlow.
7. THE Settings_Page SHALL ser responsiva para viewports a partir de 320px de largura.
8. WHEN o usuário interage com um slider de aparência, THE Settings_Page SHALL atualizar a pré-visualização ao vivo em tempo real sem debounce visual.

---

### Requirement 5: Configuração de Horários de Funcionamento

**User Story:** Como administrador da clínica, quero configurar os horários de funcionamento por dia da semana, para que a agenda reflita corretamente a disponibilidade real da clínica.

#### Acceptance Criteria

1. THE Settings_Page SHALL exibir os 7 dias da semana com toggles de ativo/inativo para cada BusinessHours.
2. WHEN o usuário ativa um dia, THE Settings_Page SHALL exibir campos de horário de abertura e fechamento para aquele dia.
3. WHEN o usuário define horários de funcionamento, THE Settings_Page SHALL validar que o horário de fechamento é posterior ao horário de abertura; IF a validação falhar, THEN THE Settings_Page SHALL exibir uma mensagem de erro inline.
4. WHEN o usuário salva os BusinessHours, THE Settings_Page SHALL persistir os dados via API e atualizar o ScheduleCalendar para refletir os novos horários de funcionamento.
5. THE Settings_Page SHALL exibir um resumo visual dos horários configurados (ex.: "Seg–Sex: 07:00–19:00, Sáb: 07:00–13:00").

---

### Requirement 6: Gerenciamento de Bloqueios de Agenda

**User Story:** Como fisioterapeuta, quero registrar períodos de indisponibilidade na agenda, para que os horários bloqueados não sejam oferecidos para agendamento.

#### Acceptance Criteria

1. THE Settings_Page SHALL exibir a lista de BlockedTimes cadastrados com título, data/hora de início e fim.
2. WHEN o usuário cria um BlockedTime, THE Settings_Page SHALL exigir título, data de início e, para bloqueios não-dia-inteiro, horários de início e fim.
3. IF o horário de fim de um BlockedTime for anterior ao horário de início, THEN THE Settings_Page SHALL exibir uma mensagem de erro e impedir o salvamento.
4. WHEN o usuário exclui um BlockedTime, THE Settings_Page SHALL exibir uma confirmação antes de remover o registro.
5. THE Settings_Page SHALL exibir os BlockedTimes ordenados por data de início, do mais recente para o mais antigo.

---

### Requirement 7: Configuração de Tipos de Atendimento

**User Story:** Como administrador da clínica, quero definir os tipos de atendimento com duração padrão e cor, para que a agenda seja criada com as configurações corretas automaticamente.

#### Acceptance Criteria

1. THE Settings_Page SHALL exibir a lista de AppointmentTypes cadastrados com nome, duração padrão e cor.
2. WHEN o usuário cria um AppointmentType, THE Settings_Page SHALL exigir nome e duração padrão em minutos (mínimo 15, máximo 480).
3. IF o nome de um AppointmentType já existir na organização, THEN THE Settings_Page SHALL exibir uma mensagem de erro de duplicidade e impedir o salvamento.
4. WHEN o usuário exclui um AppointmentType, THE Settings_Page SHALL verificar se existem agendamentos futuros usando aquele tipo; IF existirem, THEN THE Settings_Page SHALL exibir um aviso antes de confirmar a exclusão.
5. THE Settings_Page SHALL permitir reordenar os AppointmentTypes via drag-and-drop, persistindo a ordem no servidor.

---

### Requirement 8: Políticas de Cancelamento e No-Show

**User Story:** Como administrador da clínica, quero definir políticas de cancelamento e no-show, para que as regras de negócio sejam aplicadas automaticamente nos agendamentos.

#### Acceptance Criteria

1. THE Settings_Page SHALL exibir campos para configurar a antecedência mínima de cancelamento em horas (0 a 72).
2. THE Settings_Page SHALL exibir um toggle para ativar/desativar a política de no-show com campo de taxa percentual (0% a 100%).
3. WHEN o usuário salva as SchedulePolicies, THE Settings_Page SHALL persistir os dados via API e exibir confirmação de sucesso.
4. THE Settings_Page SHALL exibir uma descrição em linguagem natural das políticas configuradas (ex.: "Cancelamentos com menos de 24h de antecedência não são permitidos").
5. IF o campo de antecedência mínima receber um valor não numérico ou fora do intervalo 0–72, THEN THE Settings_Page SHALL exibir uma mensagem de erro inline e impedir o salvamento.
