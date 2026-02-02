# Funcionalidade: Relatórios e Analytics

## Visão Geral

Sistema completo de relatórios e analytics com dashboards em tempo real e métricas de negócio.

## Recursos

- ✅ Dashboard em tempo real
- ✅ Métricas de adesão
- ✅ Análise de ocupação
- ✅ Relatórios de evolução
- ✅ Relatórios financeiros
- ✅ Cohort analysis
- ✅ Performance da equipe
- ✅ Relatórios de attendance

## Dashboards

### Dashboard Principal

- Pacientes ativos
- Consultas hoje
- Receita do mês
- Taxa de ocupação

### Analytics

- Gráfico de evolução de pacientes
- Distribuição por tipo de tratamento
- Taxa de comparecimento
- Receita por terapeuta

## Tipos de Relatório

- **Attendance** - Comparecimento
- **Performance** - Performance da equipe
- **Evolução** - Evolução dos pacientes
- **Financeiro** - Relatórios financeiros
- **Conveniado** - Por convênio
- **Aniversariantes** - Aniversariantes do mês

## Páginas

- `/reports` - Lista de relatórios
- `/analytics` - Dashboard analytics
- `/reports/attendance` - Relatório de attendance
- `/reports/team-performance` - Performance da equipe

## Componentes

- `Dashboard` - Dashboard principal
- `MetricsCard` - Card de métricas
- `AnalyticsChart` - Gráficos
- `ReportFilters` - Filtros de relatório

## API

```typescript
// GET /analytics/dashboard
// Cloud Function ou agregação client-side
// getDashboardMetrics(orgId, startDate, endDate)
const { data } = await getDashboardMetrics({
  organization_id: orgId,
  start_date: startDate,
  end_date: endDate,
});

// GET /reports/attendance
const { data } = await getAttendanceReport({
  start_date: startDate,
  end_date: endDate,
});
```

## Veja Também

- [Financeiro](./financeiro.md) - Relatórios financeiros
- [Agenda](./agenda.md) - Dados de agendamento
