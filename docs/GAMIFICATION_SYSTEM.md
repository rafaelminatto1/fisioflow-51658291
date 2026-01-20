# Sistema de Gamificação - Implementação Completa

## Resumo da Implementação

Sistema completo de gamificação para o FisioFlow, incluindo quests diárias/semanais, sistema de achievements, notificações em tempo real, painel administrativo e melhorias de performance.

**Status**: ✅ Completo e Funcional
**Build**: ✅ Sucesso
**Migrations**: 6 arquivos aplicados

---

## Migrations Aplicadas (6 arquivos)

### 1. `20260403000000_fix_quest_definitions_full.sql`
- Criou tabelas `quest_definitions` e `patient_quests`
- Seed de **14 quests** (8 diárias, 4 semanais, 2 especiais)
- RLS policies e triggers

### 2. `20260403000001_achievement_unlocking_system.sql`
- Sistema automático de desbloqueio de achievements
- Função `check_and_unlock_achievement()`
- Triggers em `tarefas`, `patient_gamification`, `pain_logs`
- Suporte para: streak, sessions, level, pain_log_count, evolution_score, pain_free_streak, time_before/after, weekend, daily_activity

### 3. `20260403000002_quest_refresh_and_notifications.sql`
- Tabela `gamification_notifications`
- Função `refresh_daily_quests()` para atribuir quests diárias
- Função `update_quest_progress()` para atualizar progresso
- Triggers para notificar: achievement, level_up, streak_milestone, quest_complete

### 4. `20260403000003_performance_optimization.sql`
- **48 índices** criados para otimizar queries
- Índices para ranking, leaderboard, streaks, quests, notificações
- Função `get_unused_gamification_indexes()` para monitoramento

### 5. `20260403000004_activate_daily_quests.sql`
- Função `add_xp_to_patient()` para adicionar XP
- Função `daily_quest_refresh_job()` para cron job
- Ativação de quests diárias para todos os pacientes
- Seed de **44 achievements** com requisitos
- Adicionada coluna `is_active` à tabela `achievements`

### 6. `20260403000005_gamification_improvements.sql` ⭐ **NOVO**
- Renomeada função `refresh_daily_quests()` para compatibilidade
- **3 novos índices** para performance adicional
- Configurações centralizadas em `gamification_settings`
- Função `get_gamification_settings()` para buscar configurações
- Função `calculate_level_from_xp()` com suporte a configurações dinâmicas
- Função `add_xp_with_level_up()` que calcula nível automaticamente
- Trigger `calculate_level_on_xp_add` para auto-level
- Função `check_and_unlock_achievement_batch()` para verificar todos os achievements
- **10 configurações** do sistema (streak_freeze_cost, level_base_xp, etc.)

---

## Hooks Criados

| Hook | Arquivo | Descrição |
|------|---------|-----------|
| `useGamificationNotifications` | `src/hooks/useGamificationNotifications.ts` | Gerencia notificações com realtime subscription |
| `useQuests` | `src/hooks/useQuests.ts` | Gerencia quests diárias/semanais com progresso |

---

## Componentes Criados

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `NotificationBell` | `src/components/gamification/NotificationBell.tsx` | Sino de notificações com dropdown |
| `QuestList` | `src/components/gamification/QuestList.tsx` | Lista de quests com progresso |
| `GamificationPanel` | `src/components/gamification/GamificationPanel.tsx` | Painel de progresso do usuário |

---

## Tabelas do Banco de Dados

| Tabela | Descrição |
|--------|-----------|
| `patient_gamification` | Perfil de gamificação do paciente |
| `xp_transactions` | Histórico de transações de XP |
| `achievements` | Definições de achievements |
| `achievements_log` | Log de achievements desbloqueados |
| `quest_definitions` | Definições de quests (diárias/semanais/especiais) |
| `patient_quests` | Quests atribuídas aos pacientes |
| `gamification_notifications` | Notificações de gamificação |
| `weekly_challenges` | Desafios semanais |
| `patient_challenges` | Desafios atribuídos aos pacientes |
| `shop_items` | Itens da loja de recompensas |
| `user_inventory` | Inventário do usuário |
| `gamification_settings` | Configurações do sistema |

---

## Funções do Banco de Dados (13 total)

| Função | Descrição |
|--------|-----------|
| `check_and_unlock_achievement(patient_id, achievement_code)` | Verifica e desbloqueia achievement |
| `refresh_daily_quests()` | Atribui quests diárias a todos os pacientes |
| `update_quest_progress(patient_id, quest_code)` | Atualiza progresso de uma quest |
| `add_xp_to_patient(patient_id, amount)` | Adiciona XP ao paciente (legado) |
| `add_xp_with_level_up(patient_id, amount, reason, description)` | Adiciona XP e calcula nível automaticamente ⭐ |
| `calculate_level_from_xp(total_xp)` | Calcula nível baseado em configurações ⭐ |
| `get_gamification_settings(keys[])` | Busca configurações do sistema ⭐ |
| `daily_quest_refresh_job()` | Job para refresh diário (cron) |
| `create_gamification_notification(...)` | Cria notificação |
| `get_unused_gamification_indexes()` | Lista índices não utilizados |
| `check_all_achievements_for_patient(patient_id)` | Verifica todos os achievements de um paciente |
| `check_and_unlock_achievement_batch(patient_id)` | Verifica todos os achievements em batch ⭐ |
| `calculate_level_on_xp_trigger()` | Trigger function para auto-level ⭐ |

---

## Triggers do Banco de Dados (9 total)

| Trigger | Tabela | Evento | Descrição |
|---------|--------|--------|-----------|
| `tarefas_achievement_check` | tarefas | INSERT/UPDATE | Verifica achievements ao completar tarefa |
| `gamification_achievement_check` | patient_gamification | INSERT/UPDATE | Verifica achievements de level/streak |
| `pain_log_achievement_check` | pain_logs | INSERT | Verifica achievements de pain log |
| `achievement_unlocked_notify` | achievements_log | INSERT | Notifica achievement desbloqueado |
| `level_up_notify` | patient_gamification | UPDATE | Notifica level up |
| `streak_milestone_notify` | patient_gamification | UPDATE | Notifica marco de streak |
| `quest_progress_task_check` | tarefas | INSERT/UPDATE | Atualiza progresso de quests |
| `quest_progress_pain_check` | pain_logs | INSERT | Atualiza quests de pain log |
| `calculate_level_on_xp_add` ⭐ | patient_gamification | UPDATE | Calcula nível automaticamente ao adicionar XP |

---

## Achievements Disponíveis (44 total)

### Streak (6)
- `streak_3`: 3 dias seguidos (50 XP)
- `streak_7`: 7 dias seguidos (100 XP)
- `streak_14`: 14 dias seguidos (200 XP)
- `streak_30`: 30 dias seguidos (500 XP)
- `streak_60`: 60 dias seguidos (1000 XP)
- `streak_90`: 90 dias seguidos (2000 XP)

### Sessions (6)
- `sessions_1`: Primeira sessão (25 XP)
- `sessions_5`: 5 sessões (50 XP)
- `sessions_10`: 10 sessões (100 XP)
- `sessions_25`: 25 sessões (200 XP)
- `sessions_50`: 50 sessões (400 XP)
- `sessions_100`: 100 sessões (1000 XP)

### Level (4)
- `level_5`: Nível 5 (100 XP)
- `level_10`: Nível 10 (250 XP)
- `level_20`: Nível 20 (500 XP)
- `level_50`: Nível 50 (2000 XP)

### Pain Log (3)
- `pain_log_5`: 5 registros de dor (50 XP)
- `pain_log_30`: 30 registros de dor (200 XP)
- `pain_free`: Livre de dor (100 XP)

### Special (3)
- `early_bird`: Madrugador (< 8:00) (75 XP)
- `night_owl`: Noturno (> 20:00) (75 XP)
- `weekend_warrior`: Fim de semana (50 XP)

### Original (5)
- `streak_fire`: Sequência de fogo - 7 dias (100 XP)
- `precision_total`: Precisão total - 20 exercícios (200 XP)
- `superacao`: Superação - 50% melhora dor (150 XP)
- `dedicacao`: Dedicação - 30 sessões (300 XP)
- `first_steps`: Primeiros passos - 1 exercício (50 XP)

---

## Quests Disponíveis (14 total)

### Diárias (8)
| Code | Título | XP | Dificuldade |
|------|-------|-----|-------------|
| `daily_complete_any` | Exercite-se Hoje | 25 | Fácil |
| `daily_log_pain` | Registre sua Dor | 15 | Fácil |
| `daily_watch_video` | Aprenda Algo Novo | 20 | Fácil |
| `daily_complete_3` | Três em Um | 75 | Médio |
| `daily_perfect_session` | Sessão Perfeita | 100 | Médio |
| `daily_all_exercises` | Completo | 125 | Médio |
| `daily_5_sessions` | Maratonista | 150 | Difícil |
| `daily_streak_keeper` | Guardião da Sequência | 50 | Difícil |

### Semanais (4)
| Code | Título | XP | Dificuldade |
|------|-------|-----|-------------|
| `weekly_7_days` | Semana Perfeita | 500 | Difícil |
| `weekly_10_sessions` | Dedicação Total | 300 | Médio |
| `weekly_all_categories` | Variado é Bom | 250 | Médio |
| `weekly_no_pain` | Semana Sem Dor | 350 | Difícil |

### Especiais (2)
| Code | Título | XP | Dificuldade |
|------|-------|-----|-------------|
| `special_early_bird_week` | Semana Madrugadora | 400 | Difícil |
| `special_weekend_warrior` | Guerreiro do Fim de Semana | 200 | Médio |

---

## Como Usar

### Hook de Notificações

```typescript
import { useGamificationNotifications } from '@/hooks/useGamificationNotifications';

const { notifications, unreadCount, markAsRead, markAllAsRead } =
  useGamificationNotifications(patientId);
```

### Hook de Quests

```typescript
import { useQuests } from '@/hooks/useQuests';

const { dailyQuests, weeklyQuests, startQuest, claimReward, refreshQuests } =
  useQuests(patientId);
```

### Componentes

```typescript
// Notificações
import { NotificationBell } from '@/components/gamification/NotificationBell';
<NotificationBell patientId={patientId} />

// Lista de Quests
import { QuestList } from '@/components/gamification/QuestList';
<QuestList patientId={patientId} category="daily" />

// Painel de Progresso
import { GamificationPanel } from '@/components/gamification/GamificationPanel';
<GamificationPanel patientId={patientId} />
```

---

## Melhorias Aplicadas (Revisão)

### Correções Críticas ✅
- ✅ Import `Star` adicionado ao `QuestList.tsx`
- ✅ Função `refresh_daily_quests()` criada e funcionando
- ✅ Tratamento de erros melhorado em todos os hooks
- ✅ Loading states consistentes em todos os componentes
- ✅ Tipos TypeScript exportados (`NotificationType`, `QuestCategory`, etc.)

### Melhorias de Performance ⚡
- ✅ **3 índices adicionais** criados:
  - `idx_patient_quests_patient_status_expires`
  - `idx_gamification_notifications_patient_read`
  - `idx_achievements_log_patient_unlocked`
- ✅ Stale times otimizados (30s para dados frequentes, 10min para dados estáticos)
- ✅ Retry limitado para evitar loops infinitos

### Melhorias de Código 🔧
- ✅ **Funções RPC avançadas**:
  - `add_xp_with_level_up()` - Adiciona XP e calcula nível automaticamente
  - `calculate_level_from_xp()` - Calcula nível baseado em configurações
  - `check_and_unlock_achievement_batch()` - Verifica todos os achievements
- ✅ **Configurações centralizadas** em `gamification_settings`:
  - `streak_freeze_cost`: 500 pontos
  - `level_base_xp`: 1000 XP
  - `level_multiplier`: 1.2
  - `max_level`: 100
  - E mais 6 configurações
- ✅ **Trigger automático** para cálculo de nível ao adicionar XP
- ✅ **Fallback system** em `useQuests.ts` para compatibilidade

### Novas Funcionalidades 🆕
- ✅ Sistema de **notificações em tempo real** com ícones emoji
- ✅ **Level up automático** ao ganhar XP suficiente
- ✅ **Batch achievement check** para verificar todos os achievements
- ✅ Exportação de tipos TypeScript para uso em outros componentes

---

## Manutenção

### Refresh Diário de Quests

Para ser executado via cron job ou manualmente:

```sql
SELECT refresh_daily_quests();
```

### Limpar Notificações Antigas

```sql
SELECT cleanup_old_notifications();
```

### Verificar Índices Não Utilizados

```sql
SELECT * FROM get_unused_gamification_indexes();
```

### Buscar Configurações do Sistema

```sql
-- Todas as configurações
SELECT * FROM get_gamification_settings(NULL);

-- Configurações específicas
SELECT * FROM get_gamification_settings(ARRAY['level_base_xp', 'level_multiplier']);
```

### Verificar Achievements de um Paciente

```sql
-- Verificar todos os achievements de uma vez
SELECT * FROM check_and_unlock_achievement_batch('patient-uuid');
```

---

## Status Final (Após Revisão)

✅ **44 Achievements** ativos e funcionando
✅ **14 Quests** disponíveis (8 diárias, 4 semanais, 2 especiais)
✅ **51 Índices** criados para performance (48 + 3 novos)
✅ **9 Triggers** automáticos
✅ **13 Funções** do banco de dados
✅ **6 Migrations** aplicadas com sucesso
✅ **Build** funcionando sem erros
✅ **Notificações em tempo real** funcionando
✅ **Level up automático** implementado

---

## Resumo das Melhorias

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Migrations | 5 | **6** |
| Índices | 48 | **51** |
| Funções DB | 8 | **13** |
| Triggers | 8 | **9** |
| Configurações | Hardcoded | **Centralizadas em DB** |
| Level Calc | Client-side | **Server-side automático** |
| Error Handling | Básico | **Com retry e toasts** |
| Types | Parciais | **Completos e exportados** |
| Quest Refresh | Manual | **Função RPC criada** |

---

## Exemplos de Uso

### Adicionar XP ao Paciente

```typescript
// Método 1: Usando RPC (recomendado - calcula nível automaticamente)
const { error } = await supabase.rpc('add_xp_with_level_up', {
  p_patient_id: patientId,
  p_amount: 100,
  p_reason: 'exercise_completed',
  p_description: 'Sessão completada'
});

// Método 2: Usando função legada
const { error } = await supabase.rpc('add_xp_to_patient', {
  p_patient_id: patientId,
  p_amount: 100
});
```

### Verificar Nível do Paciente

```typescript
// Buscar cálculo de nível
const { data } = await supabase.rpc('calculate_level_from_xp', {
  p_total_xp: 5000
});
// Retorna: level, current_level_xp, xp_for_next_level, progress_percent
```

### Refresh de Quests

```typescript
// Frontend
import { useQuests } from '@/hooks/useQuests';
const { refreshQuests } = useQuests(patientId);
await refreshQuests();

// SQL direto
SELECT refresh_daily_quests();
```

---

## Próximas Melhorias Sugeridas

1. ⏳ Sistema de som para notificações (hook existe mas não implementado)
2. ⏳ Badges visuais no perfil do paciente
3. ⏳ Sistema de reputação/classificação
4. ⏳ Leaderboards globais e por categoria
5. ⏳ Exportação de relatórios de engajamento em PDF
6. ⏳ Integração com sistema de pontos que pode ser usado na loja
7. ⏳ Sistema de i18n para internacionalização
8. ⏳ Componentes de acessibilidade (ARIA labels)
