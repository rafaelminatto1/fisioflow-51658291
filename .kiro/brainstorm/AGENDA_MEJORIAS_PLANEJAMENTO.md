# FisioFlow - Agenda: Planejamento de Melhorias e Inovações

> Data: 22/02/2026
> Status: Modo de Planejamento

---

## Executive Summary

O sistema de agenda do FisioFlow é uma implementação madura e funcional, mas possui **gaps significativos** para ser tornado uma solução de classe mundial. Este documento apresenta um planejamento estratégico com **100+ ideias** organizadas em categorias, prioridades e fases de implementação.

### Principais Conclusões da Análise

| Aspecto | Estado Atual | Oportunidade |
|----------|---------------|--------------|
| **Funcionalidades** | Sólido com drag-and-drop, múltiplas views | Faltam recursos de AI, automação avançada |
| **Performance** | Virtualização parcial, cache otimizado | Gargalos em mobile, falta de memoização |
| **UX/UI** | shadcn/ui + design system | Falta micro-interações, animações, feedback visual |
| **Integração AI** | Firebase AI Logic + Genkit configurados | **Nenhum** uso de AI no agendamento atualmente |
| **Mobile vs Web** | Web muito mais avançado | Grande disparidade entre plataformas |

---

## 1. Funcionalidades AI-Powered (Firebase AI Logic + Genkit)

### 1.1 Smart Slot Recommendations
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Muito Alto

#### Ideias:
- **`aiSuggestOptimalSlot`**: Sugerir horários ótimos baseado em:
  - Histórico de comparecimento do paciente
  - Padrões de preferência de horário
  - Recomendações clínicas baseadas no tratamento
  - Disponibilidade do terapeuta especializado

- **Predictive No-Show Detection**: Prever probabilidade de falta
  - Usar modelo treinado com dados históricos
  - Features: horário, dia da semana, clima, comunicação prévia
  - Ação: sugerir confirmação dupla ou reserva de overbooking

- **Dynamic Capacity Optimization**: Capacidade dinâmica baseada em AI
  - Analisar padrões de demanda por período
  - Sugerir ajustes de capacidade automaticamente
  - Considerar sazonalidade e tendências

#### Implementação:
```typescript
// Adicionar ao unified-ai-service.ts
case 'suggestOptimalSlot':
  return await aiSuggestOptimalSlot({
    patientId: params.patientId,
    treatmentType: params.treatmentType,
    therapistPreferences: params.preferences,
    urgency: params.urgency,
    // Usar Gemini 2.5 Flash para velocidade
  });
```

### 1.2 Intelligent Waitlist Matching
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Alto

#### Ideias:
- **ML-Based Priority Scoring**: Substituir pesos fixos por modelo aprendido
  - Analisar fatores: urgência clínica, tempo de espera, especialidade
  - Considerar dados de previsão de recuperação

- **Patient Acceptance Prediction**: Prever probabilidade de aceitação
  - Histórico de recusas e aceitações
  - Momento do dia/semana com maior taxa de aceitação
  - Personalização por perfil de paciente

- **Smart Slot Allocation**: Alocação inteligente de slots
  - Balancear carga entre terapeutas
  - Considerar especialidades necessárias
  - Otimizar fluxo de pacientes

### 1.3 Natural Language Scheduling
**Prioridade:** Média | **Complexidade:** Alta | **Impacto:** Muito Alto

#### Ideias:
- **NLP Parser**: "Agendar retorno para João em 2 semanas, preferencialmente manhã"
- **Voice Commands**: Agendamento por voz usando Web Speech API
- **Quick Actions**: Frases pré-definidas acelerando criação

### 1.4 Proactive Assistant Enhancement
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Alto

#### Ideias:
- **Predictive Reschedule**: Sugerir reagendamentos proativos
  - Detectar padrões de cancelamento
  - Oferecer alternativas antes da data limite

- **Follow-up Automation**: Follow-ups automatizados inteligentes
  - Identificar pacientes inativos
  - Sugerir próximo agendamento baseado em progresso clínico

- **Revenue Optimization**: Otimização de receita
  - Identificar slots subutilizados
  - Sugerir campanhas de preenchimento

---

## 2. Melhorias de UX/UI

### 2.1 Micro-interações
**Prioridade:** Média | **Complexidade:** Baixa | **Impacto:** Médio

#### Ideias:
- **Touch Feedback**: Feedback tátil em todas as ações (Haptics API)
- **Loading Animations**: Animações de loading temáticas (fisioterapia)
- **Success Celebrations**: Confete ou animação ao completar agendamento
- **Empty States**: Ilustrações e mensagens em estados vazios
- **Skeleton Screens**: Skeletons animados durante carregamento

### 2.2 Visual Enhancements
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Alto

#### Ideias:
- **Calendar Heat Map**: Mapa de calor mostrando ocupação
  - Verde: disponível
  - Amarelo: médio
  - Vermelho: cheio
  - Clickable para ver detalhes

- **Timeline Visual**: Linha do tempo vertical com indicadores
  - Marcar eventos especiais (feriados, campanhas)
  - Indicador de horário atual com animação
  - Preview de dias adjacentes

- **Color-coded Appointments**: Cores por tipo/status
  - Personalizável pelo usuário
  - Legenda sempre visível
  - Contraste acessível

### 2.3 Navigation Patterns
**Prioridade:** Alta | **Complexidade:** Baixa | **Impacto:** Alto

#### Ideias:
- **Pull-to-Refresh**: Puxar para atualizar agenda (mobile)
- **Swipe Navigation**: Swipes para navegar entre dias/semanas
- **Keyboard Shortcuts**: Atalhos de teclado (web/desktop)
  - `N`: novo agendamento
  - `D`: mudar para dia
  - `W`: mudar para semana
  - `M`: mudar para mês
  - `?`: mostrar help

- **Quick Views**: Views rápidas clicáveis
  - "Hoje", "Amanhã", "Esta semana"
  - "Horário livre mais próximo"
  - "Meus pacientes"

### 2.4 Dark Mode & Accessibility
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Alto

#### Ideias:
- **System Dark Mode**: Respeitar preferência do sistema
- **High Contrast Mode**: Modo de alto contraste para acessibilidade
- **Reduced Motion**: Opção para reduzir animações
- **Text Sizing**: Tamanho de texto ajustável (Dynamic Type)
- **Screen Reader**: Suporte completo a leitores de tela
- **Color Blind Friendly**: Paleta acessível para daltonismo

---

## 3. Melhorias de Performance

### 3.1 Virtualization
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Muito Alto

#### Ideias:
- **Time Slot Virtualization**: Renderizar apenas slots visíveis
  - Usar react-window / react-virtualized
  - Overscan de 3-5 slots
  - Reciclagem de componentes

- **Appointment List Virtualization**: Lista virtualizada de agendamentos
  - FlashList para React Native
  - Lazy loading de imagens
  - Placeholder skeletons

### 3.2 Memoization
**Prioridade:** Alta | **Complexidade:** Baixa | **Impacto:** Alto

#### Ideias:
- **Component Memoization**: `React.memo` em todos os cards
  - `AppointmentCard` memoizado
  - `TimeSlotCell` memoizado
  - Comparação customizada

- **Hook Optimization**: `useMemo` e `useCallback`
  - Filtragem de agendamentos memoizada
  - Cálculos de overlap memoizados
  - Ordenação otimizada

### 3.3 Cache Strategy
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Muito Alto

#### Ideias:
- **IndexedDB Cache**: Cache persistente no navegador
  - Multi-layer: memory → IndexedDB → network
  - Stale-while-revalidate pattern
  - Cache invalidation inteligente

- **Period-based Prefetch**: Prefetch de períodos adjacentes
  - Delay de 500ms após carregamento principal
  - Network-aware (pular em conexões lentas)
  - Cancelable requests

- **Smart Cache Invalidation**: Invalidação inteligente
  - Por período de tempo
  - Por tipo de mutação
  - Por eventos de realtime

### 3.4 Firebase Optimization
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Muito Alto

#### Ideias:
- **Firestore Indexing**: Índices otimizados para queries comuns
  - Composite indexes por data + terapeuta
  - Indexes por status
  - Auto-criação via emulator

- **Query Optimization**: Queries otimizadas
  - `limit()` e `startAfter()` para paginação
  - Evitar `where()` em campos não indexados
  - Batch queries quando possível

- **Realtime Throttling**: Throttling de updates
  - Debounce de 300ms para múltiplos updates
  - Batch updates em intervalos
  - Suppression de updates redundantes

---

## 4. Funcionalidades de Agenda

### 4.1 Drag & Drop Enhanced
**Prioridade:** Média | **Complexidade:** Alta | **Impacto:** Alto

#### Ideias:
- **Mobile Drag & Drop**: Implementar em React Native
  - Usar react-native-gesture-handler
  - Visual feedback durante drag
  - Haptic feedback on drop
  - Conflict preview

- **Collision Detection**: Detecção de colisões em tempo real
  - Preview visual de sobreposição
  - Sugestões de horários alternativos
  - Resizing visual

- **Multi-select Drag**: Drag de múltiplos itens
  - Seleção por range
  - Bulk drag
  - Confirmation dialog

### 4.2 Advanced Filtering
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Alto

#### Ideias:
- **Quick Filters**: Filtros rápidos acionáveis
  - Botões: "Apenas hoje", "Faltas", "Pagamentos pendentes"
  - Combinação de filtros
  - Saved filters presets

- **Smart Search**: Busca inteligente
  - Busca em nome do paciente, tratamento, terapeuta
  - Fuzzy search
  - Search history
  - Recent searches

- **Advanced Filters**: Filtros avançados
  - Por tipo de tratamento
  - Por status de pagamento
  - Por período de tempo (range picker)
  - Por equipamento/sala

### 4.3 Recurring Appointments
**Prioridade:** Média | **Complexidade:** Alta | **Impacto:** Muito Alto

#### Ideias:
- **Flexible Recurrence**: Recorrência flexível
  - Diário, semanal, quinzenal, mensal
  - Dias específicos da semana (ex: terça e quinta)
  - Recorrência customizada (ex: a cada 2 dias)
  - Data de fim automática (ex: após X sessões)

- **Recurrence Management**: Gerenciamento inteligente
  - Editar ocorrência única ou toda série
  - Pular ocorrência específica
  - Atualizar série a partir de certa data

- **Auto-renew**: Renovação automática
  - Alertar quando série vai terminar
  - Sugestão de extensão
  - One-click renewal

### 4.4 Appointment Templates
**Prioridade:** Média | **Complexidade:** Baixa | **Impacto:** Médio

#### Ideias:
- **Template System**: Sistema de templates
  - Criar templates de agendamento
  - "Sessão inicial", "Follow-up", "Avaliação"
  - Auto-preencher campos

- **Quick Templates**: Templates rápidos
  - Clique duplo para criar de template
  - Drag de template para horário
  - Personalização por terapeuta

---

## 5. Funcionalidades de Waitlist

### 5.1 Enhanced Waitlist UI
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Alto

#### Ideias:
- **Visual Timeline**: Timeline visual da lista de espera
  - Indicador de posição
  - Tempo estimado de espera
  - Progress bar animada

- **Priority Indicators**: Indicadores de prioridade
  - Badges coloridos (Urgente, Alta, Normal)
  - Sorting por prioridade
  - Drag para reordenar

- **Bulk Actions**: Ações em massa
  - Oferecer slot para múltiplos pacientes
  - Remover selecionados
  - Alterar prioridade em lote

### 5.2 Waitlist Automation
**Prioridade:** Alta | **Complexidade:** Alta | **Impacto:** Muito Alto

#### Ideias:
- **Auto-Offer Slots**: Oferta automática de slots
  - Quando slot se abre
  - Match por prioridade
  - Multi-channel (WhatsApp, Email, Push)

- **Smart Follow-up**: Follow-up inteligente
  - Lembrete automático após X dias
  - Contador de ofertas
  - Auto-remove após X recusas

- **Capacity-based Waitlist**: Lista baseada em capacidade
  - Diferentes listas por tipo de serviço
  - Waitlists especializadas
  - Cross-list transfer

---

## 6. Integrações e Ecosistema

### 6.1 Third-party Calendars
**Prioridade:** Média | **Complexidade:** Alta | **Impacto:** Médio

#### Ideias:
- **Google Calendar Sync**: Sincronização bidirecional
  - Read/write events
  - Conflict detection
  - Selective sync

- **Outlook Integration**: Integração com Outlook
  - Calendar sync
  - Meeting invitations
  - Room booking

- **iCal Export**: Export para iCal
  - Subscribe URL
  - Webcal support
  - Auto-sync

### 6.2 Communication Channels
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Muito Alto

#### Ideias:
- **WhatsApp Business**: API oficial do WhatsApp
  - Envio de confirmações
  - Lembretes automáticos
  - Quick reply buttons

- **SMS Integration**: SMS para notificações
  - Confirmations via SMS
  - Reminders 24h antes
  - OTP para verificação

- **Email Templates**: Templates de email personalizáveis
  - Variáveis: nome, data, horário, terapeuta
  - HTML emails
  - Tracking de abertura

### 6.3 Payment Integration
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Alto

#### Ideias:
- **Online Booking Payments**: Pagamento no agendamento
  - Cartão de crédito
  - PIX
  - Payment link via WhatsApp

- **Payment Reminders**: Lembretes de pagamento
  - Antes da consulta
  - Após o serviço
  - Recuperação de inadimplência

---

## 7. Dashboard & Analytics

### 7.1 Smart Dashboard
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Muito Alto

#### Ideias:
- **Daily Overview**: Visão diária
  - Agendamentos de hoje
  - Slots disponíveis
  - No-shows previsíveis
  - Faturamento do dia

- **Weekly Insights**: Insights semanais
  - Comparativo com semana passada
  - Trend de ocupação
  - Horários mais populares

- **KPI Cards**: Cards de KPI
  - Taxa de no-show
  - Taxa de cancelamento
  - Ticket médio
  - NPS score

### 7.2 Predictive Analytics
**Prioridade:** Média | **Complexidade:** Alta | **Impacto:** Muito Alto

#### Ideias:
- **Demand Forecast**: Previsão de demanda
  - Prever lotação futura
  - Identificar dias de pico
  - Sugestão de overbooking controlado

- **Seasonal Analysis**: Análise sazonal
  - Padrões por mês
  - Efeitos de feriados
  - Planejamento de férias

- **Therapist Performance**: Performance por terapeuta
  - Taxa de comparecimento
  - Avaliações dos pacientes
  - Sugestão de carga otimizada

---

## 8. Funcionalidades Mobile-Specific

### 8.1 Gesture Control
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Alto

#### Ideias:
- **Swipe Actions**: Swipes para ações rápidas
  - Swipe left: agendar
  - Swipe right: detalhes
  - Swipe up: próximo dia
  - Swipe down: dia anterior

- **Pinch to Zoom**: Pinch para zoom
  - Zoom no horário
  - Visualização granular
  - Snap aos slots

- **Long Press**: Pressão longa para menu
  - Menu contextual
  - Quick actions
  - Preview de detalhes

### 8.2 Offline Support
**Prioridade:** Média | **Complexidade:** Alta | **Impacto:** Muito Alto

#### Ideias:
- **Offline Mode**: Modo offline completo
  - Cache de agendamentos locais
  - Criar agendamentos offline
  - Sync automático ao reconectar

- **Conflict Resolution**: Resolução de conflitos
  - Detectar conflitos no sync
  - Offer resolutions ao usuário
  - Merge inteligente

### 8.3 Push Notifications
**Prioridade:** Alta | **Complexidade:** Baixa | **Impacto:** Alto

#### Ideias:
- **Smart Notifications**: Notificações inteligentes
  - Agrupar notificações similares
  - Actionable buttons
  - Scheduling de notificações

- **Location-based**: Baseado em localização
  - Lembrete ao chegar na clínica
  - Previsão de trânsito
  - Check-in automático

---

## 9. Funcionalidades Terapeuta-Centric

### 9.1 Therapist Dashboard
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Muito Alto

#### Ideias:
- **Personal Calendar**: Calendário personalizado
  - Bloqueio de horários
  - Pausas e almoços configuráveis
  - Preferências de horário

- **Patient Queue**: Fila de pacientes
  - Próximo paciente
  - Tempo estimado
  - Check-in automático

- **Quick Notes**: Anotações rápidas
  - Notas do dia
  - Tarefas pendentes
  - Links rápidos para evoluções

### 9.2 Scheduling Preferences
**Prioridade:** Média | **Complexidade:** Baixa | **Impacto:** Médio

#### Ideias:
- **Smart Scheduling**: Agendamento inteligente
  - Auto-sugerir horários favoritos
  - Evitar horários não preferidos
  - Balancear carga semanal

- **Break Scheduling**: Agendamento de pausas
  - Pausas automáticas
  - Bloqueio de períodos
  - Sync com feriados

---

## 10. Funcionalidades Paciente-Centric

### 10.1 Patient Portal
**Prioridade:** Alta | **Complexidade:** Alta | **Impacto:** Muito Alto

#### Ideias:
- **Self-Scheduling**: Auto-agendamento
  - Portal web para pacientes
  - App mobile para pacientes
  - Seleção de horários disponíveis

- **Appointment Management**: Gerenciamento de agendamentos
  - Ver histórico
  - Cancelar com penalidade
  - Reagendar com facilidade

- **Waitlist Position**: Ver posição na lista de espera
  - Tempo estimado
  - Notificação de abertura
  - Auto-aceitação

### 10.2 Reminders
**Prioridade:** Alta | **Complexidade:** Baixa | **Impacto:** Muito Alto

#### Ideias:
- **Multi-channel Reminders**: Lembretes multi-canal
  - WhatsApp 48h antes
  - SMS 24h antes
  - Push 2h antes
  - Email confirmação

- **Customizable Reminders**: Lembretes personalizáveis
  - Cadastra preferências
  - Frequência configurável
  - Unsubscribe fácil

---

## 11. Design System & Visual

### 11.1 Component Library
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Alto

#### Ideias:
- **Unified Components**: Componentes unificados
  - Same components web/mobile
  - Design tokens compartilhados
  - Storybook documentation

- **Animation Library**: Biblioteca de animações
  - Spring animations
  - Stagger animations
  - Micro-interactions catalogadas

### 11.2 Themes & Customization
**Prioridade:** Média | **Complexidade:** Baixa | **Impacto:** Médio

#### Ideias:
- **Custom Themes**: Temas personalizáveis
  - Brand colors
  - Logo customizado
  - Per-organization themes

- **User Preferences**: Preferências de usuário
  - Theme selection
  - Compact vs spacious
  - Show/hide elements

---

## 12. Segurança & Compliance

### 12.1 Data Protection
**Prioridade:** Alta | **Complexidade:** Média | **Impacto:** Muito Alto

#### Ideias:
- **Encryption**: Criptografia de dados sensíveis
  - Dados de pacientes criptografados
  - End-to-end encryption para comunicações
  - Key rotation automática

- **Audit Trail**: Trilha de auditoria
  - Log de todas as alterações
  - Who, what, when
  - Export de logs

### 12.2 Compliance
**Prioridade:** Alta | **Complexidade:** Alta | **Impacto:** Muito Alto

#### Ideias:
- **LGPD Compliance**: Compliance com LGPD
  - Consentimento explícito
  - Right to be forgotten
  - Data export

- **HIPAA Ready**: Preparado para HIPAA
  - Access controls
  - Data retention policies
  - BAA templates

---

## 13. Inovações Emergentes

### 13.1 AI-First Features
**Prioridade:** Média | **Complexidade:** Muito Alta | **Impacto:** Transformador

#### Ideias:
- **AI Scheduling Assistant**: Assistente de agendamento por AI
  - Chat interface
  - Natural language understanding
  - Proactive suggestions

- **Auto-Documentation**: Documentação automática
  - Transcrição de consulta
  - Auto-gerar SOAP notes
  - Sugestão de evolução

- **Predictive Treatment**: Tratamento preditivo
  - Baseado em evoluções anteriores
  - Sugestão de próximos passos
  - Outcome predictions

### 13.2 Advanced Integrations
**Prioridade:** Baixa | **Complexidade:** Muito Alta | **Impacto:** Alto

#### Ideias:
- **Telehealth Integration**: Integração com telemedicina
  - Video calls no agendamento
  - Link automático
  - Recording integration

- **EMR Integration**: Integração com sistemas de EMR
  - FHIR standard
  - HL7 messages
  - Bi-directional sync

---

## Roadmap de Implementação

### Fase 1: Quick Wins (1-2 semanas)
**Prioridade:** Alta | **Impacto Imediato**

1. ✅ Pull-to-refresh no mobile
2. ✅ Swipe gestures para navegação
3. ✅ Memoização de componentes
4. ✅ Dark mode completo
5. ✅ Haptic feedback em ações
6. ✅ Quick filters (hoje, amanhã, esta semana)
7. ✅ Loading skeletons melhorados
8. ✅ Empty states ilustrados
9. ✅ Keyboard shortcuts no web
10. ✅ Search improvements

### Fase 2: Performance Core (3-4 semanas)
**Prioridade:** Alta | **Impacto Alto**

1. ✅ Virtualização de calendário (web + mobile)
2. ✅ Cache otimizado com IndexedDB
3. ✅ Prefetch inteligente de períodos
4. ✅ Firestore indexes otimizados
5. ✅ Realtime throttling
6. ✅ Offline mode (básico)
7. ✅ Lazy loading de componentes
8. ✅ Performance monitoring (Firebase Performance)

### Fase 3: AI Scheduling (4-6 semanas)
**Prioridade:** Alta | **Impacto Transformador**

1. ✅ AI slot suggestions (Gemini 2.5 Flash)
2. ✅ No-show prediction model
3. ✅ Waitlist ML-based matching
4. ✅ Proactive reschedule suggestions
5. ✅ Revenue optimization insights
6. ✅ Natural language scheduling (MVP)
7. ✅ Capacity AI optimization

### Fase 4: UX/UI Enhancements (3-4 semanas)
**Prioridade:** Média | **Impacto Alto**

1. ✅ Calendar heat map
2. ✅ Timeline visual melhorado
3. ✅ Color coding customizável
4. ✅ Micro-interactions (todas)
5. ✅ Transitions animadas
6. ✅ Drag & drop mobile
7. ✅ Multi-select com bulk actions
8. ✅ Quick actions context menu

### Fase 5: Advanced Features (6-8 semanas)
**Prioridade:** Média | **Impacto Muito Alto**

1. ✅ Recurring appointments avançado
2. ✅ Appointment templates
3. ✅ Waitlist automation completa
4. ✅ WhatsApp Business API
5. ✅ Smart dashboard
6. ✅ Predictive analytics
7. ✅ Patient portal (MVP)
8. ✅ Therapist preferences

### Fase 6: Ecosystem & Integrations (4-6 semanas)
**Prioridade:** Baixa | **Impacto Alto**

1. ✅ Google Calendar sync
2. ✅ Outlook integration
3. ✅ iCal export
4. ✅ Payment gateway integration
5. ✅ Telehealth integration
6. ✅ EMR/FHIR integration

### Fase 7: Innovation Lab (Ongoing)
**Prioridade:** Experimental | **Impacto Transformador**

1. ✅ AI scheduling assistant chatbot
2. ✅ Voice commands
3. ✅ Auto-documentation com AI
4. ✅ Predictive treatment planning
5. ✅ 3D visualization (future)
6. ✅ AR integration (future)

---

## Métricas de Sucesso

| KPI | Meta Atual | Meta Futura | Como Medir |
|-----|------------|--------------|------------|
| Time-to-schedule | 5 cliques | 2 cliques | Analytics |
| No-show rate | 15% | < 8% | Dashboards |
| Calendar load time | 2s | < 500ms | Performance Monitoring |
| User satisfaction | N/A | NPS > 8 | Survey |
| Therapist efficiency | N/A | +30% | Productivity metrics |
| Patient self-service | 0% | 60% | Analytics |

---

## Decisões de Arquitetura

### Firebase AI Logic Integration
```
┌─────────────────────────────────────────────────────────────┐
│                  Client Apps                            │
│  ┌──────────────┐  ┌──────────────┐               │
│  │   Web (Vite) │  │  iOS (Expo) │               │
│  └──────┬───────┘  └──────┬───────┘               │
│         │                   │                          │
└─────────┼───────────────────┼──────────────────────────┘
          │                   │
          ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│           Firebase AI Logic (Client SDK)                   │
│  • gemini-2.5-flash (quick suggestions)               │
│  • gemini-2.5-pro (complex reasoning)                │
└──────────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         Cloud Functions (Genkit + Vertex AI)              │
│  • unified-ai-service.ts                              │
│  • suggestOptimalSlot flow                             │
│  • predictNoShow flow                                  │
│  • waitlistMatching flow                               │
└──────────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌─────────────────┐   ┌─────────────────┐
│   Firestore     │   │   Vertex AI     │
│   (appointments)│   │   (embeddings)  │
└─────────────────┘   └─────────────────┘
```

### Performance Stack
```
┌─────────────────────────────────────────────────────────────┐
│                   UI Layer                               │
│  • React.memo components                                │
│  • useMemo/useCallback                                   │
│  • Virtualized rendering                                 │
└──────────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌─────────────────┐   ┌─────────────────┐
│   React Query   │   │   IndexedDB     │
│   (TanStack)    │   │   (Cache)       │
└────────┬────────┘   └────────┬────────┘
         │                     │
         └──────────┬──────────┘
                    ▼
         ┌─────────────────────┐
         │  Firebase SDK      │
         └────────┬──────────┘
                  ▼
         ┌─────────────────────┐
         │  Firebase RTDB     │
         │  (Real-time)      │
         └─────────────────────┘
```

---

## Notas de Implementação

### Considerações Importantes

1. **Migração Gradual**: Não reescrever tudo de uma vez. Fazer feature flags para A/B testing.

2. **Mobile-First**: Priorizar mobile no design, já que a maioria dos terapeutas usa mobile.

3. **Offline-First**: Arquitetura que funciona offline e sincroniza quando possível.

4. **Progressive Enhancement**: Funcionalidades básicas funcionam sem JS avançado.

5. **Accessibility Test**: Testar com leitores de tela em cada sprint.

6. **Performance Budget**: Definir orçamento de performance (ex: < 500ms para calendar load).

7. **Error Boundaries**: Implementar em todos os componentes críticos.

8. **Monitoring**: Integrar Firebase Performance Monitoring e Crashlytics.

### Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|--------|-----------|---------------|-------------|
| AI predictions inaccurate | Alto | Médio | A/B testing + fallback para regras |
| Performance degradation | Alto | Baixa | Feature flags + rollback rápido |
| Mobile fragmentation | Médio | Alta | Test em múltiplos dispositivos |
| User adoption | Alto | Médio | Onboarding progressivo + tooltips |
| Cost overruns (Gemini API) | Médio | Baixa | Cache + rate limiting |

---

## Conclusão

Este planejamento apresenta um caminho claro para transformar a agenda do FisioFlow de um sistema funcional para uma solução de classe mundial. As ideias foram organizadas por prioridade, complexidade e impacto, permitindo uma implementação faseada e controlada.

**Próximos Passos:**

1. Revisar e priorizar este planejamento com o time
2. Definir MVP da Fase 1 com datas
3. Criar feature flags para as novas funcionalidades
4. Começar implementação dos Quick Wins
5. Estabelecer métricas de baseline
6. Iterar baseado em feedback

---

*Documento gerado com base em análise do código existente, pesquisa de tendências de mercado, e benchmarking com soluções líderes (Google Calendar, Notion Calendar, calendários médicos).*
