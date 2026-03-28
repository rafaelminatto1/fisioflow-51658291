import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Bone, Activity, Scissors, Shield, HeartHandshake } from "lucide-react";
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

// ─── Profile config ───────────────────────────────────────────────────────────

interface ProfileConfig {
  id: PatientProfileCategory | "all";
  label: string;
  icon: React.ReactNode;
}

const PROFILES: ProfileConfig[] = [
  { id: "all", label: "Todos", icon: null },
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
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {profile.icon}
            {profile.label}
            <Badge
              variant={isActive ? "secondary" : "outline"}
              className="h-4 min-w-[1rem] px-1 text-[10px] leading-none"
            >
              {count}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TemplateListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 rounded-lg border space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-14" />
          </div>
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      <Search className="h-8 w-8 mb-3 opacity-40" />
      <p className="text-sm font-medium">
        {hasSearch ? "Nenhum template encontrado" : "Nenhum template disponível"}
      </p>
      {hasSearch && (
        <p className="text-xs mt-1">Tente ajustar os filtros ou o termo de busca</p>
      )}
    </div>
  );
}

// ─── Pure filter function (exported for testing) ─────────────────────────────

/**
 * Filters templates by patient profile and search query.
 * When profile is 'all', all templates are returned (before search filtering).
 * Search is case-insensitive and matches name, conditionName or templateVariant.
 */
export function filterTemplates(
	templates: ExerciseTemplate[],
	profile: PatientProfileCategory | "all",
	query: string,
): ExerciseTemplate[] {
	if (!Array.isArray(templates)) return [];
	let result = templates;
  if (profile !== "all") {
    result = result.filter((t) => t.patientProfile === profile);
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
  // Local input state for debounce
  const [inputValue, setInputValue] = useState(searchQuery);

  // Sync external searchQuery → local input when it changes externally
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // Debounce: call onSearchChange 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, onSearchChange]);

  // Filter templates client-side for display
  const filteredTemplates = useMemo(
    () => filterTemplates(templates, activeProfile, searchQuery),
    [templates, activeProfile, searchQuery],
  );

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">Templates</h3>
        <Button size="sm" onClick={onCreateClick} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Criar Template
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar templates..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Profile filter tabs */}
      <ProfileFilterTabs
        templates={templates}
        activeProfile={activeProfile}
        onProfileChange={onProfileChange}
      />

      {/* Template list */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {loading ? (
          <TemplateListSkeleton />
        ) : filteredTemplates.length === 0 ? (
          <EmptyState hasSearch={!!searchQuery.trim() || activeProfile !== "all"} />
        ) : (
          filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={template.id === selectedId}
              onClick={() => onSelect(template.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
