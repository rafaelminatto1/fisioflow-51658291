# Funcionalidade: Gamificação

## Visão Geral

Sistema de gamificação para aumentar a adesão dos pacientes aos exercícios e tratamentos prescritos.

## Status Atual

⚠️ **Parcialmente implementado** - Backend pronto, frontend em desenvolvimento

## Recursos

### Backend (Pronto)

- ✅ Tabelas de gamificação
- ✅ Sistema de pontos
- ✅ Sistema de conquistas
- ✅ Sistema de níveis
- ✅ Sistema de desafios

### Frontend (Parcial)

- ✅ Dashboard admin
- ⚠️ Dashboard para pacientes
- ⚠️ Visualização de conquistas
- ⚠️ Leaderboards
- ⚠️ Desafios customizáveis

## Mecânicas

### Pontos

- +10 pontos por exercício completado
- +50 pontos por semana consecutiva
- +100 pontos por meta alcançada
- -10 pontos por dia perdido

### Níveis

- Nível 1: 0-100 pontos
- Nível 2: 101-300 pontos
- Nível 3: 301-600 pontos
- ...e assim por diante

### Conquistas

- 🏆 Primeira semana
- 🔥 7 dias consecutivos
- 💪 100 exercícios
- ⭐ Meta alcançada

### Desafios

- Desafio semanal
- Desafio mensal
- Desafio personalizado

## Páginas

- `/admin/gamification` - Configuração admin
- `/gamification` - Dashboard do paciente (planejado)

## Componentes

- `GamificationDashboard` - Dashboard de gamificação
- `AchievementBadge` - Badge de conquista
- `Leaderboard` - Ranking de pacientes
- `ProgressRing` - Anel de progresso

## API

```typescript
// GET /gamification/points
const { data } = await supabase
  .from('user_points')
  .select('*')
  .eq('user_id', userId);

// POST /gamification/points
const { data } = await supabase.rpc('add_points', {
  user_id: userId,
  points: 10,
  reason: 'exercise_completed',
});

// GET /gamification/achievements
const { data } = await supabase
  .from('achievements')
  .select('*')
  .eq('user_id', userId);
```

## Roadmap

- [ ] Dashboard para pacientes
- [ ] Sistema de conquistas visual
- [ ] Leaderboards
- [ ] Desafios customizáveis
- [ ] Notificações de conquistas
- [ ] Integração com exercícios

## Veja Também

- [Exercícios](./exercicios.md) - Pontos por exercício
- [Pacientes](./pacientes.md) - Engajamento
