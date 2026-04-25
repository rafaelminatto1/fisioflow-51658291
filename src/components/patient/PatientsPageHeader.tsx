import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Download,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  PATIENT_DIRECTORY_PATHOLOGY_STATUSES,
  PATIENT_FINANCIAL_STATUS_OPTIONS,
  PATIENT_PAYER_MODEL_OPTIONS,
} from "@/lib/constants/patient-directory";
import { cn } from "@/lib/utils";
import { PatientPageInsights } from "./PatientPageInsights";

export interface PatientsPageHeaderStats {
  totalCount: number;
  currentPage: number;
  totalPages: number;
  activeCount: number;
  newCount: number;
  atRiskCount: number;
  completedCount: number;
  inactive7: number;
  inactive30: number;
  inactive60: number;
  noShowRisk: number;
  hasUnpaid: number;
}

export interface HeaderFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
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
  pathologyFilter: string;
  onPathologyFilterChange: (value: string) => void;
  pathologyOptions: string[];
  pathologyStatusFilter: string;
  onPathologyStatusFilterChange: (value: string) => void;
  paymentModelFilter: string;
  onPaymentModelFilterChange: (value: string) => void;
  financialStatusFilter: string;
  onFinancialStatusFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  activeAdvancedFiltersCount: number;
  totalFilteredLabel?: string;
  onClearAllFilters: () => void;
  hasActiveFilters: boolean;
  classificationFilter?: string;
  onClassificationFilterChange?: (classification: string) => void;
  activeFilterChips?: HeaderFilterChip[];
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
  pathologyFilter,
  onPathologyFilterChange,
  pathologyOptions,
  pathologyStatusFilter,
  onPathologyStatusFilterChange,
  paymentModelFilter,
  onPaymentModelFilterChange,
  financialStatusFilter,
  onFinancialStatusFilterChange,
  sortBy,
  onSortByChange,
  activeAdvancedFiltersCount,
  totalFilteredLabel,
  onClearAllFilters,
  hasActiveFilters,
  classificationFilter = "all",
  onClassificationFilterChange,
  activeFilterChips = [],
  children,
}: PatientsPageHeaderProps) {
  return (
    <div className="space-y-6" data-testid="patients-page-header">
      <div className="relative overflow-hidden rounded-[2.25rem] border border-white/40 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.08),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.10),_transparent_32%),linear-gradient(135deg,_rgba(255,255,255,0.92),_rgba(248,250,252,0.84))] p-6 shadow-[0_32px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-800/60 dark:bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_32%),linear-gradient(135deg,_rgba(15,23,42,0.94),_rgba(15,23,42,0.82))] md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-primary/10 shadow-inner shadow-primary/20">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                  Gestão de Pacientes
                </h1>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {stats.totalCount} pacientes no diretório clínico-operacional
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <HeaderStatCard
                label="Ativos"
                value={stats.activeCount}
                tone="emerald"
                isSelected={classificationFilter === "active"}
                onClick={() => onClassificationFilterChange?.("active")}
                icon={CheckCircle2}
              />
              <HeaderStatCard
                label="Novos"
                value={stats.newCount}
                tone="blue"
                isSelected={classificationFilter === "new_patient"}
                onClick={() => onClassificationFilterChange?.("new_patient")}
                icon={Sparkles}
              />
              <HeaderStatCard
                label="Em risco"
                value={stats.atRiskCount}
                tone="amber"
                isSelected={classificationFilter === "at_risk"}
                onClick={() => onClassificationFilterChange?.("at_risk")}
                icon={AlertTriangle}
              />
              <HeaderStatCard
                label="Alta / Finalizados"
                value={stats.completedCount}
                tone="violet"
                isSelected={classificationFilter === "completed"}
                onClick={() => onClassificationFilterChange?.("completed")}
                icon={CheckCircle2}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:max-w-[360px] xl:justify-end">
            <Button
              onClick={onNewPatient}
              className="h-14 rounded-[1.35rem] px-7 text-xs font-black uppercase tracking-[0.22em] shadow-xl shadow-primary/20"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Paciente
            </Button>
            <Button
              variant="outline"
              onClick={onExport}
              className="h-14 rounded-[1.35rem] border-white/50 bg-white/70 px-5 text-xs font-black uppercase tracking-[0.18em] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/50"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button
              variant={showAnalytics ? "default" : "outline"}
              onClick={onToggleAnalytics}
              className="h-14 rounded-[1.35rem] px-5 text-xs font-black uppercase tracking-[0.18em]"
            >
              {showAnalytics ? "Ocultar análises" : "Análises"}
            </Button>
          </div>
        </div>

        <div className="mt-8 space-y-5 rounded-[2rem] border border-white/50 bg-white/70 p-5 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/40">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(170px,0.8fr))] 2xl:grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(150px,0.72fr))]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="search-patients"
                name="search-patients"
                type="search"
                value={searchTerm}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Buscar por nome, contato, patologia, parceiro ou profissional"
                className="h-14 rounded-[1.2rem] border-slate-200/80 bg-white pl-11 text-sm font-medium dark:border-slate-800 dark:bg-slate-950/60"
              />
            </div>

            <HeaderSelect
              value={statusFilter}
              onValueChange={onStatusFilterChange}
              placeholder="Status do paciente"
              items={[
                { value: "all", label: "Todos status" },
                { value: "Inicial", label: "Inicial" },
                { value: "Em Tratamento", label: "Em Tratamento" },
                { value: "Recuperação", label: "Recuperação" },
                { value: "Concluído", label: "Concluído" },
                { value: "Alta", label: "Alta" },
              ]}
            />

            <HeaderSelect
              value={pathologyFilter}
              onValueChange={onPathologyFilterChange}
              placeholder="Patologia principal"
              items={[
                { value: "all", label: "Patologias" },
                ...pathologyOptions.map((option) => ({
                  value: option,
                  label: option,
                })),
              ]}
            />

            <HeaderSelect
              value={pathologyStatusFilter}
              onValueChange={onPathologyStatusFilterChange}
              placeholder="Status da patologia"
              items={[
                { value: "all", label: "Status clínico" },
                ...PATIENT_DIRECTORY_PATHOLOGY_STATUSES,
              ]}
            />

            <HeaderSelect
              value={paymentModelFilter}
              onValueChange={onPaymentModelFilterChange}
              placeholder="Pagamento"
              items={[{ value: "all", label: "Pagamento" }, ...PATIENT_PAYER_MODEL_OPTIONS]}
            />

            <HeaderSelect
              value={financialStatusFilter}
              onValueChange={onFinancialStatusFilterChange}
              placeholder="Financeiro"
              items={[{ value: "all", label: "Financeiro" }, ...PATIENT_FINANCIAL_STATUS_OPTIONS]}
            />
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <HeaderSelect
                value={sortBy}
                onValueChange={onSortByChange}
                placeholder="Ordenar"
                className="w-full xl:w-[250px]"
                items={[
                  { value: "created_at_desc", label: "Mais recentes" },
                  { value: "created_at_asc", label: "Mais antigos" },
                  { value: "name_asc", label: "Nome (A-Z)" },
                  { value: "name_desc", label: "Nome (Z-A)" },
                  { value: "main_condition_asc", label: "Patologia (A-Z)" },
                  { value: "main_condition_desc", label: "Patologia (Z-A)" },
                  { value: "next_appointment_asc", label: "Próxima sessão" },
                  { value: "last_activity_desc", label: "Última atividade" },
                  { value: "open_balance_desc", label: "Maior saldo pendente" },
                  { value: "risk_desc", label: "Maior risco" },
                ]}
                triggerPrefix={<ArrowUpDown className="h-4 w-4 text-primary" />}
              />
              {children}
              {activeAdvancedFiltersCount > 0 && (
                <Badge className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary">
                  {activeAdvancedFiltersCount} filtro(s) avançado(s)
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                {stats.noShowRisk} com risco de falta
              </Badge>
              <Badge className="rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                {stats.hasUnpaid} com pendência financeira
              </Badge>
              <Badge className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                Pág. {stats.currentPage} de {stats.totalPages || 1}
              </Badge>
            </div>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onRemove}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/10"
                >
                  {chip.label}
                  <X className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}

          {hasActiveFilters && (
            <div className="flex flex-col gap-3 border-t border-slate-200/60 pt-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                  {totalFilteredLabel ?? "Base filtrada"}
                </p>
                <Button
                  variant="ghost"
                  onClick={onClearAllFilters}
                  className="h-9 rounded-full px-4 text-[11px] font-black uppercase tracking-[0.18em] text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                >
                  <X className="mr-2 h-4 w-4" />
                  Limpar filtros
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">
          <PatientPageInsights
            totalPatients={stats.totalCount}
            classificationStats={{
              active: stats.activeCount,
              inactive7: stats.inactive7,
              inactive30: stats.inactive30,
              inactive60: stats.inactive60,
              noShowRisk: stats.noShowRisk,
              hasUnpaid: stats.hasUnpaid,
              newPatients: stats.newCount,
              completed: stats.completedCount,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function HeaderSelect({
  value,
  onValueChange,
  placeholder,
  items,
  className,
  triggerPrefix,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  items: Array<{ value: string; label: string }>;
  className?: string;
  triggerPrefix?: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          "h-14 rounded-[1.2rem] border-slate-200/80 bg-white text-left text-xs font-black uppercase tracking-[0.16em] dark:border-slate-800 dark:bg-slate-950/60",
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {triggerPrefix}
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-2xl">
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function HeaderStatCard({
  label,
  value,
  icon: Icon,
  tone,
  isSelected,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: "emerald" | "blue" | "amber" | "violet";
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const toneMap = {
    emerald:
      "border-emerald-200/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300",
    blue: "border-blue-200/70 bg-blue-50/80 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-300",
    amber:
      "border-amber-200/70 bg-amber-50/80 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300",
    violet:
      "border-violet-200/70 bg-violet-50/80 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/20 dark:text-violet-300",
  } satisfies Record<string, string>;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border px-4 py-4 text-left transition duration-200",
        toneMap[tone],
        isSelected
          ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
          : "hover:-translate-y-0.5 hover:shadow-lg",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
        <div className="rounded-full bg-white/70 p-2 dark:bg-slate-900/50">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight">{value}</p>
      <div className="mt-3 h-1 w-14 rounded-full bg-current/25" />
    </button>
  );
}
