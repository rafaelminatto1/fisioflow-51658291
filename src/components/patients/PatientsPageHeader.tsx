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
  Download,
  Activity,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import type { PatientClassification } from '@/hooks/usePatientStats';
import { cn } from '@/lib/utils';

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
    <header className="space-y-6" data-testid="patients-page-header">
      {/* Top Row: Title + Primary Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-premium-sm border border-slate-100 dark:border-slate-800/50">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white sm:text-3xl" id="page-title">
            Pacientes
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Gerenciamento completo da base de pacientes e prontuários
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleAnalytics}
            className={cn("h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 transition-all", showAnalytics && "bg-primary text-white border-primary shadow-lg shadow-primary/20")}
            aria-pressed={showAnalytics}
            title={showAnalytics ? 'Ocultar análises' : 'Ver análises'}
          >
            <Activity className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onExport}
            className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800"
            title="Exportar pacientes"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={onNewPatient}
            data-testid="add-patient"
            className="h-10 px-5 gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-lg shadow-slate-900/10 font-bold text-xs uppercase tracking-wider"
          >
            <Plus className="h-4 w-4" />
            Novo Paciente
          </Button>
        </div>
      </div>

      {/* Unified Toolbar: Search + Inline Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" aria-hidden />
          <input
            type="search"
            placeholder="Buscar por nome, condição ou telefone..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-12 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 pl-10 pr-4 text-sm font-medium ring-offset-background transition-all placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50"
            aria-label="Buscar pacientes"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="h-12 w-[150px] text-xs font-bold rounded-2xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="Inicial">Inicial</SelectItem>
              <SelectItem value="Em Tratamento">Em Tratamento</SelectItem>
              <SelectItem value="Recuperação">Recuperação</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
            </SelectContent>
          </Select>

          <Select value={conditionFilter} onValueChange={onConditionFilterChange}>
            <SelectTrigger className="h-12 w-[170px] text-xs font-bold rounded-2xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
              <SelectValue placeholder="Condição" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
              <SelectItem value="all">Todas condições</SelectItem>
              {uniqueConditions.map((c) => (
                <SelectItem key={String(c)} value={String(c)}>
                  {String(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Compact Classification Chips / KPIs */}
      <div className="flex flex-wrap items-center gap-3 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-inner-border">
          <Users className="h-3.5 w-3.5" />
          <span>{stats.totalCount} Pacientes</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatChip
            label="Ativos"
            value={stats.activeByClassification}
            icon={<CheckCircle2 className="h-3 w-3" />}
            variant="success"
            classification="active"
            isSelected={classificationFilter === 'active'}
            onClick={onClassificationFilterChange}
          />
          <StatChip
            label="Novos"
            value={stats.newPatients}
            icon={<Sparkles className="h-3 w-3" />}
            variant="info"
            classification="new_patient"
            isSelected={classificationFilter === 'new_patient'}
            onClick={onClassificationFilterChange}
          />
          <StatChip
            label="Risco"
            value={stats.noShowRisk}
            icon={<AlertTriangle className="h-3 w-3" />}
            variant="danger"
            classification="no_show_risk"
            isSelected={classificationFilter === 'no_show_risk'}
            onClick={onClassificationFilterChange}
          />
          <StatChip
            label="Inativos"
            value={stats.inactive30}
            icon={<Clock className="h-3 w-3" />}
            variant="warning"
            classification="inactive_30"
            isSelected={classificationFilter === 'inactive_30'}
            onClick={onClassificationFilterChange}
          />
        </div>

        {hasActiveFilters && (
          <div className="ml-auto flex items-center gap-4 animate-in fade-in slide-in-from-right-2 bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
              {totalFilteredLabel ?? 'Filtrado'}
            </span>
            <button
              type="button"
              onClick={onClearAllFilters}
              className="text-[10px] font-black uppercase tracking-[0.15em] text-primary hover:text-primary/80 transition-colors"
            >
              Limpar
            </button>
          </div>
        )}
      </div>
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
      'border-emerald-100 bg-emerald-50/40 text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-950/20 dark:text-emerald-300',
    warning:
      'border-amber-100 bg-amber-50/40 text-amber-700 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-300',
    danger:
      'border-red-100 bg-red-50/40 text-red-700 dark:border-red-800/30 dark:bg-red-950/20 dark:text-red-300',
    info:
      'border-blue-100 bg-blue-50/40 text-blue-700 dark:border-blue-800/30 dark:bg-blue-950/20 dark:text-blue-300',
  };

  const handleClick = () => {
    if (onClick && classification) {
      onClick(isSelected ? 'all' : classification);
    }
  };

  const baseClasses = cn(
    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all',
    variantClasses[variant],
    onClick && 'cursor-pointer hover:bg-opacity-80 active:scale-[0.98]',
    isSelected && 'ring-1 ring-primary ring-offset-1 ring-offset-background font-medium'
  );

  const content = (
    <>
      <span className="shrink-0 opacity-70" aria-hidden>
        {icon}
      </span>
      <span className="text-[11px] tabular-nums font-semibold">{value}</span>
      <span className="text-[10px] opacity-70 leading-none">{label}</span>
      {isSelected && (
        <span className="ml-0.5 text-[8px] opacity-60">✕</span>
      )}
    </>
  );

  if (onClick && classification) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={baseClasses}
        aria-pressed={isSelected}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}
