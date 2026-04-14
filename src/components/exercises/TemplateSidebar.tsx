import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Search, 
  Bone, 
  Activity, 
  Scissors, 
  Shield, 
  HeartHandshake, 
  FilterX, 
  ChevronDown,
  LayoutGrid
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { TemplateCard } from "./TemplateCard";
import type { ExerciseTemplate, PatientProfileCategory } from "@/types/workers";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TemplateSidebarProps {
  templates: ExerciseTemplate[];
  selectedId: string | null;
  activeProfile: PatientProfileCategory | "all";
  searchQuery: string;
  loading: boolean;
  onSelect: (id: string) => void;
  onProfileChange: (profile: PatientProfileCategory | "all") => void;
  onSearchChange: (q: string) => void;
  onCreateClick: () => void;
}

// ─── Filter Options ───────────────────────────────────────────────────────────

const DIFFICULTY_OPTIONS = [
  { id: "iniciante", label: "Iniciante" },
  { id: "intermediario", label: "Intermediário" },
  { id: "avancado", label: "Avançado" },
];

const PHASE_OPTIONS = [
  { id: "fase_aguda", label: "Fase Aguda" },
  { id: "fase_subaguda", label: "Fase Subaguda" },
  { id: "remodelacao", label: "Remodelação" },
  { id: "retorno_ao_esporte", label: "Retorno ao Esporte" },
];

const BODY_PART_OPTIONS = [
  { id: "ombro", label: "Ombro" },
  { id: "joelho", label: "Joelho" },
  { id: "quadril", label: "Quadril" },
  { id: "coluna_cervical", label: "Cervical" },
  { id: "coluna_lombar", label: "Lombar" },
  { id: "tornozelo", label: "Tornozelo" },
  { id: "cotovelo", label: "Cotovelo" },
  { id: "corpo_todo", label: "Global" },
];

// ─── Profile config ───────────────────────────────────────────────────────────

interface ProfileConfig {
  id: PatientProfileCategory | "all";
  label: string;
  icon: React.ReactNode;
}

const PROFILES: ProfileConfig[] = [
  { id: "all", label: "Todos", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { id: "ortopedico", label: "Ortopédico", icon: <Bone className="h-3.5 w-3.5" /> },
  { id: "esportivo", label: "Esportivo", icon: <Activity className="h-3.5 w-3.5" /> },
  { id: "pos_operatorio", label: "Pós-op", icon: <Scissors className="h-3.5 w-3.5" /> },
  { id: "prevencao", label: "Prevenção", icon: <Shield className="h-3.5 w-3.5" /> },
  { id: "idosos", label: "Idosos", icon: <HeartHandshake className="h-3.5 w-3.5" /> },
];

// ─── ProfileFilterTabs ────────────────────────────────────────────────────────

interface ProfileFilterTabsProps {
  templates: ExerciseTemplate[];
  activeProfile: PatientProfileCategory | "all";
  onProfileChange: (profile: PatientProfileCategory | "all") => void;
}

function ProfileFilterTabs({ templates, activeProfile, onProfileChange }: ProfileFilterTabsProps) {
  const countByProfile = useMemo(() => {
    const counts: Record<string, number> = { all: templates.length };
    for (const t of templates) {
      if (t.patientProfile) {
        counts[t.patientProfile] = (counts[t.patientProfile] ?? 0) + 1;
      }
    }
    return counts;
  }, [templates]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {PROFILES.map((profile) => {
        const count = countByProfile[profile.id] ?? 0;
        const isActive = activeProfile === profile.id;
        return (
          <button
            key={profile.id}
            type="button"
            onClick={() => onProfileChange(profile.id)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight uppercase transition-all ${
              isActive
                ? "bg-primary text-primary-foreground shadow-md scale-105"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {profile.icon}
            {profile.label}
            <span className={`ml-1 text-[9px] px-1 rounded-full ${isActive ? "bg-white/20" : "bg-muted-foreground/10"}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TemplateListSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-4 rounded-lg border space-y-3 bg-card shadow-sm">
          <div className="flex justify-between items-start gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/20 rounded-xl border border-dashed border-muted-foreground/20">
      <div className="bg-muted p-4 rounded-full mb-4">
        <FilterX className="h-8 w-8 text-muted-foreground opacity-40" />
      </div>
      <p className="text-sm font-semibold text-foreground">
        Nenhum template encontrado
      </p>
      <p className="text-xs mt-1 text-muted-foreground max-w-[200px] leading-relaxed">
        Não encontramos protocolos com esses filtros específicos.
      </p>
      <Button variant="link" size="sm" onClick={onClear} className="mt-2 text-primary font-bold">
        Limpar todos os filtros
      </Button>
    </div>
  );
}

// ─── Pure filter function (exported for testing) ─────────────────────────────

export interface AdvancedFilters {
  difficulty?: string;
  phase?: string;
  bodyPart?: string;
}

export function filterTemplates(
	templates: ExerciseTemplate[],
	profile: PatientProfileCategory | "all",
	query: string,
  advanced?: AdvancedFilters,
): ExerciseTemplate[] {
	if (!Array.isArray(templates)) return [];
	let result = templates;
  
  if (profile !== "all") {
    result = result.filter((t) => t.patientProfile === profile);
  }

  if (advanced?.difficulty) {
    result = result.filter((t) => t.difficultyLevel === advanced.difficulty);
  }

  if (advanced?.phase) {
    result = result.filter((t) => t.treatmentPhase === advanced.phase);
  }

  if (advanced?.bodyPart) {
    result = result.filter((t) => t.bodyPart === advanced.bodyPart);
  }

  const q = query.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.conditionName?.toLowerCase().includes(q) ||
        t.templateVariant?.toLowerCase().includes(q),
    );
  }

  return result;
}

// ─── TemplateSidebar ──────────────────────────────────────────────────────────

export function TemplateSidebar({
  templates,
  selectedId,
  activeProfile,
  searchQuery,
  loading,
  onSelect,
  onProfileChange,
  onSearchChange,
  onCreateClick,
}: TemplateSidebarProps) {
  const [inputValue, setInputValue] = useState(searchQuery);
  const [advFilters, setAdvancedFilters] = useState<AdvancedFilters>({});

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, onSearchChange]);

  const filteredTemplates = useMemo(
    () => filterTemplates(templates, activeProfile, searchQuery, advFilters),
    [templates, activeProfile, searchQuery, advFilters],
  );

  const hasActiveAdvancedFilters = Object.values(advFilters).some(Boolean);

  const clearFilters = () => {
    setAdvancedFilters({});
    onProfileChange("all");
    setInputValue("");
    onSearchChange("");
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="font-black text-lg tracking-tighter uppercase text-foreground">Biblioteca</h3>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            {templates.length} Protocolos Disponíveis
          </p>
        </div>
        <Button onClick={onCreateClick} className="h-9 px-4 gap-2 font-bold shadow-sm active:scale-95 transition-transform">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {/* Search and Advanced Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou condição..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pl-8 h-9 text-xs border-muted-foreground/20 focus-visible:ring-primary/30"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={`h-9 px-3 gap-2 text-xs font-bold ${hasActiveAdvancedFilters ? "border-primary text-primary bg-primary/5" : ""}`}>
              <ChevronDown className="h-3.5 w-3.5" />
              Filtros
              {hasActiveAdvancedFilters && (
                <Badge className="h-4 min-w-[1rem] px-1 text-[9px] bg-primary">!</Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Filtros Avançados</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Dificuldade */}
            <div className="p-2 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground px-2">Dificuldade</span>
              {DIFFICULTY_OPTIONS.map(opt => (
                <DropdownMenuItem 
                  key={opt.id}
                  className={`text-xs cursor-pointer ${advFilters.difficulty === opt.id ? "bg-primary/10 text-primary font-bold" : ""}`}
                  onClick={() => setAdvancedFilters(prev => ({ ...prev, difficulty: prev.difficulty === opt.id ? undefined : opt.id }))}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </div>
            
            <DropdownMenuSeparator />
            
            {/* Região */}
            <div className="p-2 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground px-2">Região</span>
              <div className="grid grid-cols-2 gap-1 px-1">
                {BODY_PART_OPTIONS.slice(0, 6).map(opt => (
                  <Button 
                    key={opt.id}
                    variant="ghost" 
                    className={`h-7 px-2 text-[10px] justify-start font-medium ${advFilters.bodyPart === opt.id ? "bg-primary/10 text-primary font-bold" : ""}`}
                    onClick={() => setAdvancedFilters(prev => ({ ...prev, bodyPart: prev.bodyPart === opt.id ? undefined : opt.id }))}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {hasActiveAdvancedFilters && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-xs text-destructive font-bold justify-center cursor-pointer"
                  onClick={() => setAdvancedFilters({})}
                >
                  Limpar Filtros
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Profile filter tabs */}
      <ProfileFilterTabs
        templates={templates}
        activeProfile={activeProfile}
        onProfileChange={onProfileChange}
      />

      {/* Template list */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-muted">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <TemplateListSkeleton />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <EmptyState onClear={clearFilters} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={template.id === selectedId}
                onClick={() => onSelect(template.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

