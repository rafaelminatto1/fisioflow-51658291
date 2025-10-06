# 🎉 Sistema de Eventos - FisioFlow

## ✨ Funcionalidades Implementadas

### 1. **Sistema de Roles e Permissões**
- ✅ Tabela `user_roles` separada para segurança
- ✅ Enum `app_role` (admin, fisioterapeuta, estagiario, paciente)
- ✅ Funções helper: `has_role()`, `is_admin()`, `is_fisio_or_admin()`, `get_user_roles()`
- ✅ RLS policies para controle de acesso
- ✅ Hook `usePermissions()` para verificação client-side

**Segurança:** As roles estão em tabela separada com SECURITY DEFINER functions para evitar escalação de privilégios.

---

### 2. **Atualizações em Tempo Real**
- ✅ Hook `useRealtimeEventos` - escuta INSERT, UPDATE, DELETE em eventos
- ✅ Hook `useRealtimePrestadores` - escuta mudanças em prestadores
- ✅ Invalidação automática de cache (React Query)
- ✅ Notificações toast para eventos criados/deletados

**Como funciona:** Usa Supabase Realtime com `postgres_changes` para sincronizar automaticamente dados entre usuários.

---

### 3. **Templates de Eventos**
- ✅ 4 templates pré-configurados:
  - 🏃 Corrida 5K
  - 🏃‍♂️ Corrida 10K
  - 🏢 Ação Corporativa
  - 🛍️ Ativação em Shopping
- ✅ Checklist padrão para cada tipo
- ✅ Valores pré-definidos de prestadores
- ✅ UI intuitiva com cards clicáveis
- ✅ Opção "Criar do zero"

**UX:** Modal de criação mostra primeiro os templates, facilitando e agilizando o processo.

---

### 4. **Exportação de Relatórios**

#### 📄 Exportação PDF
- ✅ **Prestadores:**
  - Tabela formatada com nome, contato, CPF/CNPJ, valor, status
  - Totais: Pago, Pendente, Geral
  - Design profissional com tema grid

- ✅ **Participantes:**
  - Lista completa com informações de contato
  - Estatísticas de engajamento (seguidores)
  - Percentual de seguidores do perfil

- ✅ Biblioteca: `jspdf` + `jspdf-autotable`
- ✅ Nomes de arquivo automáticos (slug do evento)

#### 📊 Exportação CSV
- ✅ Mantido para compatibilidade
- ✅ Fácil importação em Excel/Planilhas

**Localização:** Botões "CSV" e "PDF" nas tabs de Prestadores e Participantes.

---

### 5. **Dashboard Analytics**
- ✅ Página dedicada: `/eventos/analytics`
- ✅ Gráficos visuais:
  - **Status dos Eventos** - barra de progresso para Agendados/Em Andamento/Concluídos
  - **Engajamento** - taxa de seguidores e maior evento
  - **Resumo Financeiro** - breakdown de custos (prestadores vs insumos)
- ✅ Hook `useEventosStats()` para cálculos centralizados
- ✅ Cards com animações `hover-scale` e `fade-in`

**Dados calculados:**
- Total de eventos por status
- Taxa de seguidores (%)
- Custos totais e separados
- Pagamentos pendentes

---

### 6. **Melhorias de UX**

#### Loading States
- ✅ Skeletons nos stats cards
- ✅ Spinners em botões de submit
- ✅ Estados de loading em listagens

#### Animações
- ✅ `hover-scale` nos cards
- ✅ `animate-fade-in` em componentes principais
- ✅ Transições suaves (300ms cubic-bezier)

#### Validações
- ✅ Schemas Zod completos
- ✅ Mensagens de erro em português
- ✅ Validação client + server
- ✅ Feedback visual imediato

---

## 🗂️ Estrutura de Arquivos

```
src/
├── hooks/
│   ├── useEventos.ts
│   ├── useEventosStats.ts
│   ├── useEventoTemplates.ts
│   ├── useRealtimeEventos.ts
│   ├── useRealtimePrestadores.ts
│   └── usePermissions.ts
│
├── components/eventos/
│   ├── NewEventoModal.tsx (com templates)
│   ├── EventosAnalytics.tsx
│   ├── EventosStatsWidget.tsx
│   ├── PrestadoresTab.tsx (export PDF)
│   └── ParticipantesTab.tsx (export PDF)
│
├── lib/
│   ├── export/pdfExport.ts
│   └── validations/evento.ts
│
└── pages/
    ├── Eventos.tsx
    └── EventosAnalytics.tsx

supabase/migrations/
└── [timestamp]_user_roles_system.sql
```

---

## 🚀 Como Usar

### Criar Evento com Template
1. Clique em "Novo Evento"
2. Escolha um template ou "Criar do zero"
3. Ajuste dados conforme necessário
4. Clique em "Criar Evento"

### Exportar Relatórios
1. Acesse o evento desejado
2. Vá para aba "Prestadores" ou "Participantes"
3. Clique em "CSV" ou "PDF"
4. Arquivo será baixado automaticamente

### Ver Analytics
1. Na página de Eventos, clique em "Analytics" no AdminDashboard
2. Ou acesse `/eventos/analytics` diretamente
3. Visualize métricas consolidadas de todos os eventos

### Gerenciar Permissões
```typescript
const { isAdmin, canWrite } = usePermissions();

if (isAdmin) {
  // Acesso total
}

if (canWrite('eventos')) {
  // Pode criar/editar eventos
}
```

---

## 🔒 Segurança

### RLS Policies
- ✅ Eventos: apenas admin e fisio podem criar/editar
- ✅ Prestadores: apenas admin e fisio podem acessar
- ✅ Participantes: apenas admin, fisio e estagiário podem acessar
- ✅ Checklist: segue permissões de eventos

### Validações
- ✅ Zod schemas em todas as entradas
- ✅ Validação de URLs (WhatsApp, links)
- ✅ Validação de datas (início < fim)
- ✅ Validação de valores monetários

---

## 📊 Métricas Disponíveis

### EventosStats
```typescript
{
  totalEventos: number
  eventosAgendados: number
  eventosEmAndamento: number
  eventosConcluidos: number
  totalPrestadores: number
  prestadoresPendentes: number
  custoTotal: number
  custoTotalPrestadores: number
  custoTotalInsumos: number
  totalParticipantes: number
  participantesSeguemPerfil: number
  eventoComMaisParticipantes: number
  percentualSeguidores: number
}
```

---

## 🎨 Design System

### Cores Semânticas
- `primary` - Ações principais
- `secondary` - Ações secundárias
- `destructive` - Ações de delete/erro
- `muted-foreground` - Textos auxiliares

### Animações
- `animate-fade-in` - Entrada suave
- `hover-scale` - Escala no hover (1.05)
- `transition-all duration-300` - Transições suaves

### Componentes
- Cards com hover effects
- Progress bars para visualização de dados
- Badges para status
- Skeletons para loading

---

## 📝 Próximos Passos Sugeridos

1. **Notificações Push/Email**
   - Lembrete de eventos próximos
   - Notificação de pagamento recebido
   - Alerta de novos participantes

2. **Integração WhatsApp**
   - Envio automático de listas
   - Links diretos para grupos

3. **QR Code Check-in**
   - Geração de QR por participante
   - App de leitura para check-in no dia

4. **Relatórios Avançados**
   - Comparação entre eventos
   - Evolução temporal
   - ROI por categoria

5. **Calendário Visual**
   - Vista mensal de eventos
   - Drag & drop para reagendar
   - Sync com Google Calendar

---

## 🐛 Debugging

### Console Logs
- Eventos em tempo real logam no console
- Mutations logam sucesso/erro
- Útil para desenvolvimento

### React Query Devtools
```bash
# Já configurado no projeto
# Acesse /__devtools no navegador
```

### Supabase Logs
```bash
# Ver logs de auth, db, edge functions
# Acesse dashboard do Supabase
```

---

## 📚 Referências

- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [React Query](https://tanstack.com/query/latest)
- [Zod Validation](https://zod.dev/)
- [jsPDF](https://github.com/parallax/jsPDF)
- [Tailwind Animations](https://tailwindcss.com/docs/animation)

---

**Desenvolvido com ❤️ para Activity Fisioterapia**
