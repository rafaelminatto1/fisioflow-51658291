# Plano de Implementação - Sistema de Agenda para Fisioterapia

- [x] 1. Configurar estrutura base e modelos de dados





  - Criar interfaces TypeScript para Appointment, Patient e Payment
  - Implementar validações Zod para todos os modelos
  - Configurar tipos de status e permissões por role
  - _Requisitos: 1.1, 2.1, 4.1, 6.1_

- [x] 2. Implementar migrations do banco de dados


  - [x] 2.1 Criar tabela appointments com relacionamentos


    - Definir schema completo da tabela appointments
    - Configurar foreign keys para patients e users
    - Adicionar índices para performance de consultas por data
    - _Requisitos: 1.1, 2.1_

  - [x] 2.2 Criar tabela payments para controle financeiro


    - Implementar schema de payments vinculado a appointments
    - Configurar campos para diferentes tipos de pagamento
    - Adicionar constraints para integridade de dados
    - _Requisitos: 4.1, 4.2, 4.3_

  - [x] 2.3 Configurar Row Level Security (RLS)


    - Implementar políticas RLS para appointments por role
    - Configurar acesso de pacientes apenas aos próprios dados
    - Definir permissões diferenciadas para therapist/intern
    - _Requisitos: 6.1, 6.2, 6.3, 8.1, 8.5_

- [x] 3. Desenvolver serviços de dados


  - [x] 3.1 Implementar AppointmentService


    - Criar métodos CRUD para agendamentos
    - Implementar busca por semana e filtros
    - Adicionar validação de conflitos de horário
    - _Requisitos: 1.1, 2.1, 2.2, 7.1, 7.2_

  - [x] 3.2 Implementar PaymentService






    - Criar métodos para registrar pagamentos
    - Implementar controle de sessões pagas/pendentes
    - Adicionar cálculos de pacotes e sessões restantes
    - _Requisitos: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.3 Implementar PatientService estendido


    - Adicionar métodos específicos para agenda
    - Implementar busca rápida de pacientes
    - Configurar dados financeiros por paciente
    - _Requisitos: 3.2, 4.1_

- [x] 4. Criar hooks customizados

  - [x] 4.1 Implementar useAgenda hook


    - Gerenciar estado da semana atual e navegação
    - Implementar cache inteligente com TanStack Query
    - Adicionar sincronização em tempo real via Supabase
    - _Requisitos: 1.1, 6.5, 7.1, 7.2_

  - [x] 4.2 Implementar useAppointments hook


    - Criar operações CRUD reativas para agendamentos
    - Implementar invalidação automática de cache
    - Adicionar otimistic updates para melhor UX
    - _Requisitos: 2.1, 2.2, 2.3, 2.4_

  - [x] 4.3 Implementar usePermissions hook



    - Gerenciar permissões baseadas no role do usuário
    - Implementar verificações de acesso por ação
    - Configurar redirecionamentos automáticos
    - _Requisitos: 6.1, 6.2, 6.3, 6.4_

- [x] 5. Desenvolver componente WeeklyCalendar

  - [x] 5.1 Criar grid de horários base


    - Implementar layout de 7 dias x horários (7h-19h)
    - Configurar slots de 30 minutos clicáveis
    - Adicionar navegação entre semanas
    - _Requisitos: 1.1, 1.2, 1.3, 7.1, 7.2_

  - [x] 5.2 Implementar renderização de agendamentos



    - Criar blocos coloridos para cada agendamento
    - Implementar sistema de cores por status
    - Adicionar informações básicas nos blocos (nome, horário)
    - _Requisitos: 1.4, 5.4, 5.5_

  - [x] 5.3 Adicionar interatividade e eventos


    - Implementar cliques em slots vazios para novo agendamento
    - Configurar cliques em agendamentos para abrir modal
    - Adicionar hover states e feedback visual
    - _Requisitos: 2.1, 3.1, 1.5_

- [x] 6. Desenvolver AppointmentModal

  - [x] 6.1 Criar estrutura base do modal


    - Implementar modal responsivo com informações do paciente
    - Adicionar seções para dados, status e ações
    - Configurar fechamento e validações
    - _Requisitos: 3.1, 3.2, 3.3_

  - [x] 6.2 Implementar SessionControls

    - Criar botões para ações de sessão (concluir, faltar, reagendar)
    - Implementar mudança de status com validações
    - Adicionar botão "Iniciar Evolução" com navegação
    - _Requisitos: 3.4, 5.1, 5.2, 5.3_

  - [x] 6.3 Implementar PaymentControls

    - Criar interface para marcar pagamentos
    - Implementar seleção de tipo (sessão/pacote)
    - Adicionar histórico de pagamentos da sessão
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7. Desenvolver NewAppointmentModal

  - [x] 7.1 Criar formulário de novo agendamento


    - Implementar seleção de paciente com busca
    - Configurar seleção de data e horário
    - Adicionar campo de observações
    - _Requisitos: 2.1, 2.2_

  - [x] 7.2 Implementar validações e conflitos

    - Adicionar validação de horários disponíveis
    - Implementar detecção de conflitos em tempo real
    - Configurar sugestões de horários alternativos
    - _Requisitos: 2.2, 2.3_

- [x] 8. Implementar sistema de filtros

  - [x] 8.1 Criar AgendaFilters component


    - Implementar filtro por fisioterapeuta
    - Adicionar filtro por status de agendamento
    - Configurar persistência de filtros na sessão
    - _Requisitos: 7.3, 7.4, 7.5_

  - [x] 8.2 Integrar filtros com dados


    - Conectar filtros com queries do banco
    - Implementar atualização reativa da agenda
    - Adicionar indicadores visuais de filtros ativos
    - _Requisitos: 7.3, 7.4, 7.5_

- [x] 9. Desenvolver interface para pacientes

  - [x] 9.1 Criar PatientAgendaView


    - Implementar lista simples de agendamentos do paciente
    - Configurar visualização apenas de dados básicos
    - Adicionar filtros por período (próximos/histórico)
    - _Requisitos: 8.1, 8.2, 8.3, 8.4_

  - [x] 9.2 Implementar restrições de acesso


    - Configurar redirecionamento automático para pacientes
    - Implementar bloqueio de acesso a dados de outros pacientes
    - Adicionar validações de permissão no frontend
    - _Requisitos: 8.1, 8.5_

- [x] 10. Implementar responsividade

  - [x] 10.1 Adaptar agenda para tablet


    - Ajustar grid para telas médias
    - Implementar navegação touch-friendly
    - Configurar modals responsivos
    - _Requisitos: 9.1_

  - [x] 10.2 Criar versão mobile


    - Implementar agenda em formato de lista diária
    - Configurar navegação por dias
    - Adaptar modals para telas pequenas
    - _Requisitos: 9.2_

- [x] 11. Otimizar performance

  - [x] 11.1 Implementar virtualização e cache


    - Configurar carregamento lazy de semanas
    - Implementar cache inteligente com invalidação seletiva
    - Adicionar pré-carregamento de dados adjacentes
    - _Requisitos: 9.3, 9.4_

  - [x] 11.2 Otimizar renderização


    - Implementar React.memo em componentes críticos
    - Adicionar useMemo para cálculos complexos
    - Configurar debounce em filtros e buscas
    - _Requisitos: 9.5_

- [x] 12. Implementar testes

  - [x] 12.1 Criar testes unitários

    - Testar componentes WeeklyCalendar e AppointmentModal
    - Implementar testes para hooks useAgenda e useAppointments
    - Adicionar testes de validação e permissões
    - _Requisitos: Todos os requisitos funcionais_

  - [x] 12.2 Implementar testes de integração

    - Testar fluxo completo de criação de agendamento
    - Verificar sincronização em tempo real
    - Testar navegação e carregamento de dados
    - _Requisitos: 2.1-2.5, 6.5, 7.1-7.2_

- [x] 13. Integrar com sistema existente

  - [x] 13.1 Atualizar navegação principal

    - Configurar agenda como página inicial
    - Atualizar menu de navegação
    - Implementar breadcrumbs e contexto
    - _Requisitos: 1.1_

  - [x] 13.2 Conectar com módulo de evoluções

    - Implementar navegação do modal para evolução
    - Configurar passagem de contexto do paciente
    - Adicionar retorno automático para agenda
    - _Requisitos: 3.4_


- [ ] 14. Implementar auditoria e logs

  - [x] 14.1 Configurar logs de ações

    - Implementar rastreamento de mudanças de status
    - Adicionar logs de pagamentos e cancelamentos
    - Configurar auditoria de acesso por usuário
    - _Requisitos: 6.1-6.5_

  - [x] 14.2 Criar relatórios básicos


    - Implementar relatório de agendamentos por período
    - Adicionar métricas de faltas e cancelamentos
    - Configurar exportação de dados para análise
    - _Requisitos: 4.5, 5.1-5.5_