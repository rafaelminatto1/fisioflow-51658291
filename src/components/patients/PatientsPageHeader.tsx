import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Users,
  Filter,
  Download,
  Activity,
  AlertTriangle,
  UserCheck,
  UserPlus,
  UserMinus,
  Clock,
  DollarSign,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import type { PatientClassification } from '@/hooks/usePatientStats';
import { cn } from '@/lib/utils';
import { PatientStatsCard } from './PatientStatsCard';

export interface PatientsPageHeaderStats {
  totalCount: number;
  currentPage: number;
  totalPages: number;
  activeCount: number;
  newCount: number;
  completedCount: number;
  activeByClassification: number;
  inactive7: number;
  inactive30: number;
  inactive60: number;
  noShowRisk: number;
  hasUnpaid: number;
  newPatients: number;
}

export interface PatientsPageHeaderProps {
  stats: PatientsPageHeaderStats;
  onNewPatient: () => void;
  onExport: () => void;
  onToggleAnalytics: () => void;
  showAnalytics: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  conditionFilter: string;
  onConditionFilterChange: (value: string) => void;
  uniqueConditions: string[];
  activeAdvancedFiltersCount: number;
  totalFilteredLabel?: string;
  onClearAllFilters: () => void;
  hasActiveFilters: boolean;
  classificationFilter?: PatientClassification | 'all';
  onClassificationFilterChange?: (classification: PatientClassification | 'all') => void;
  children?: React.ReactNode;
}

export function PatientsPageHeader({
  stats,
  onNewPatient,
  onExport,
  onToggleAnalytics,
  showAnalytics,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  conditionFilter,
  onConditionFilterChange,
  uniqueConditions,
  activeAdvancedFiltersCount,
  totalFilteredLabel,
  onClearAllFilters,
  hasActiveFilters,
  classificationFilter = 'all',
  onClassificationFilterChange,
  children,
}: PatientsPageHeaderProps) {
  return (
    <header className="space-y-5 sm:space-y-6">
      {/* Hero: título + descrição + ações */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            id="page-title"
          >
            Pacientes
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie o cadastro e evolução dos seus pacientes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleAnalytics}
            className="hidden sm:inline-flex"
            aria-pressed={showAnalytics}
          >
            <Activity className="mr-2 h-4 w-4" aria-hidden />
            {showAnalytics ? 'Ocultar análises' : 'Análises'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="hidden sm:inline-flex"
          >
            <Download className="mr-2 h-4 w-4" aria-hidden />
            Exportar
          </Button>
          <Button size="sm" onClick={onNewPatient} className="sm:min-w-[140px]">
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Novo Paciente</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* KPI principal + 3 secundários */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden border-0 bg-primary/5 shadow-sm transition-shadow duration-200 hover:shadow-md dark:bg-primary/10">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Users className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                  {stats.totalCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalPages > 1
                    ? `Página ${stats.currentPage} de ${stats.totalPages}`
                    : 'Total de pacientes'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <PatientStatsCard
          value={stats.activeCount}
          subtitle="Ativos (página)"
          icon={<UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />}
          color="emerald"
        />
        <PatientStatsCard
          value={stats.newCount}
          subtitle="Novos (página)"
          icon={<UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />}
          color="blue"
        />
        <PatientStatsCard
          value={stats.completedCount}
          subtitle="Concluídos (página)"
          icon={<UserMinus className="h-4 w-4 sm:h-5 sm:w-5" />}
          color="gray"
        />
      </div>

      {/* Resumo por classificação - sempre visível e clicável como filtro */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Resumo por classificação
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-7">
          <StatChip
            label="Ativos"
            value={stats.activeByClassification}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            variant="success"
            classification="active"
            isSelected={classificationFilter === 'active'}
            onClick={onClassificationFilterChange}
          />
          <StatChip
            label="Inativos 7d"
            value={stats.inactive7}
            icon={<Clock className="h-3.5 w-3.5" />}
            variant="warning"
            classification="inactive_7"
            isSelected={classificationFilter === 'inactive_7'}
            onClick={onClassificationFilterChange}
          />
          <StatChip
            label="Inativos 30d"
            value={stats.inactive30}
            icon={<Clock className="h-3.5 w-3.5" />}
            variant="danger"
            classification="inactive_30"
            isSelected={classificationFilter === 'inactive_30'}
            onClick={onClassificationFilterChange}
          />
          <StatChip
            label="Risco No-Show"
            value={stats.noShowRisk}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            variant="danger"
            classification="no_show_risk"
            isSelected={classificationFilter === 'no_show_risk'}
            onClick={onClassificationFilterChange}
          />
          <StatChip
            label="Com Pendências"
            value={stats.hasUnpaid}
            icon={<DollarSign className="h-3.5 w-3.5" />}
            variant="warning"
            classification="has_unpaid"
            isSelected={classificationFilter === 'has_unpaid'}
            onClick={onClassificationFilterChange}
          />
          <StatChip
            label="Novos Pacientes"
            value={stats.newPatients}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            variant="info"
            classification="new_patient"
            isSelected={classificationFilter === 'new_patient'}
            onClick={onClassificationFilterChange}
          />
          <StatChip
            label="Inativos 60d+"
            value={stats.inactive60}
            icon={<Clock className="h-3.5 w-3.5" />}
            variant="danger"
            classification="inactive_custom"
            isSelected={classificationFilter === 'inactive_custom'}
            onClick={onClassificationFilterChange}
          />
        </div>
      </div>

      {/* Alerta de cadastros pendentes (slot para IncompleteRegistrationAlert) */}
      {children}

      {/* Busca + filtros rápidos */}
      <Card className="overflow-hidden border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                placeholder="Buscar por nome, condição, email ou telefone..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Buscar pacientes"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger className="h-11">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="Inicial">Inicial</SelectItem>
                  <SelectItem value="Em Tratamento">Em Tratamento</SelectItem>
                  <SelectItem value="Recuperação">Recuperação</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                </SelectContent>
              </Select>
              <Select value={conditionFilter} onValueChange={onConditionFilterChange}>
                <SelectTrigger className="h-11">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
                    <SelectValue placeholder="Condição" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as condições</SelectItem>
                  {uniqueConditions.map((c) => (
                    <SelectItem key={String(c)} value={String(c)}>
                      {String(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>{totalFilteredLabel ?? 'Resultados filtrados'}</span>
                <button
                  type="button"
                  onClick={onClearAllFilters}
                  className="rounded px-2 py-1 text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </header>
  );
}

interface StatChipProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant: 'success' | 'warning' | 'danger' | 'info';
  classification?: PatientClassification;
  isSelected?: boolean;
  onClick?: (classification: PatientClassification | 'all') => void;
}

function StatChip({ label, value, icon, variant, classification, isSelected, onClick }: StatChipProps) {
  const variantClasses = {
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    warning:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    danger:
      'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200',
    info:
      'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
  };

  const handleClick = () => {
    if (onClick && classification) {
      // Toggle: if already selected, clear filter
      onClick(isSelected ? 'all' : classification);
    }
  };

  const baseClasses = cn(
    'flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
    variantClasses[variant],
    onClick && 'cursor-pointer hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
  );

  const content = (
    <>
      <span className="shrink-0 opacity-80" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold tabular-nums">{value}</p>
        <p className="truncate text-[10px] opacity-90">{label}</p>
      </div>
    </>
  );

  if (onClick && classification) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={baseClasses}
        aria-pressed={isSelected}
        aria-label={`Filtrar por ${label}${isSelected ? ' (clique para limpar)' : ''}`}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}
