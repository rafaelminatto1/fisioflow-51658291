import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { templatesApi } from "@/api/v2";
import { useTemplateUIStore } from "@/stores/useTemplateUIStore";
import { TemplateSidebar } from "./TemplateSidebar";
import { TemplateDetailPanel } from "./TemplateDetailPanel";
import { TemplateApplyFlow } from "./TemplateApplyFlow";
import { TemplateCreateFlow } from "./TemplateCreateFlow";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, Sparkles, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ExerciseTemplate } from "@/types/workers";

// ─── Empty state CTA (shown when org has no custom templates) ─────────────────

interface EmptyStateCTAProps {
  onExploreSystem: () => void;
  onCreateFirst: () => void;
}

function EmptyStateCTA({ onExploreSystem, onCreateFirst }: EmptyStateCTAProps) {
  return (
    <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/20 p-8 mb-6">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <LayoutTemplate className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-bold text-foreground">
            Sua organização ainda não tem templates personalizados
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Explore os templates do sistema como ponto de partida ou crie o seu próprio protocolo clínico personalizado.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center mt-2">
          <Button variant="outline" onClick={onExploreSystem} className="gap-2 h-11 px-6 rounded-xl border-border">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Explorar Templates do Sistema
          </Button>
          <Button onClick={handleCreateFirst} className="gap-2 h-11 px-8 rounded-xl shadow-lg">
            <Plus className="h-4 w-4" />
            Criar Meu Primeiro Template
          </Button>
        </div>
      </div>
    </div>
  );

  function handleCreateFirst() {
    onCreateFirst();
  }
}

// ─── TemplateManager ──────────────────────────────────────────────────────────

export function TemplateManager() {
  const queryClient = useQueryClient();
  const [editFlowOpen, setEditFlowOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExerciseTemplate | null>(null);
  const {
    selectedTemplateId,
    activeProfile,
    searchQuery,
    applyFlowOpen,
    createFlowOpen,
    createFlowSourceId,
    setSelectedTemplate,
    setActiveProfile,
    setSearchQuery,
    openCreateFlow,
    openApplyFlow,
    closeApplyFlow,
    closeCreateFlow,
  } = useTemplateUIStore();

  // Fetch all templates (system + custom) without pre-filtering by profile/search
  // so the sidebar can do client-side filtering and show counts per profile
  const { data, isLoading: loading } = useQuery({
    queryKey: ["templates", {}],
    queryFn: () => templatesApi.list(),
    staleTime: 1000 * 60 * 5,
  });
  const rawTemplates = data?.data ?? [];
  const templates: ExerciseTemplate[] = rawTemplates;

  const selectedTemplate: ExerciseTemplate | null =
    templates.find((t) => t.id === selectedTemplateId) ?? null;

  const hasCustomTemplates = templates.some((t) => t.templateType === "custom");

  const handleApply = () => openApplyFlow();
  const handleCustomize = () => {
    if (selectedTemplate) openCreateFlow(selectedTemplate.id);
  };
  const handleEdit = () => {
    if (!selectedTemplate) return;

    if (selectedTemplate?.templateType === "system") {
      openCreateFlow(selectedTemplate.id);
      return;
    }

    setEditingTemplate(selectedTemplate);
    setEditFlowOpen(true);
  };
  const handleDelete = () => {
    // TODO: task 13 — open delete confirmation dialog
  };

  const handleExploreSystem = () => setActiveProfile("all");
  const handleCreateFirst = () => openCreateFlow();

  // Source template for TemplateCreateFlow (customize mode)
  const createFlowSourceTemplate: ExerciseTemplate | undefined =
    createFlowSourceId
      ? (templates.find((t) => t.id === createFlowSourceId) ?? undefined)
      : undefined;

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Empty state CTA — shown above the list when no custom templates exist */}
      {!hasCustomTemplates && !loading && (
        <EmptyStateCTA
          onExploreSystem={handleExploreSystem}
          onCreateFirst={handleCreateFirst}
        />
      )}

      {/* Grid-view layout */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <TemplateSidebar
          templates={templates}
          selectedId={selectedTemplateId}
          activeProfile={activeProfile}
          searchQuery={searchQuery}
          loading={loading}
          onSelect={setSelectedTemplate}
          onProfileChange={setActiveProfile}
          onSearchChange={setSearchQuery}
          onCreateClick={() => openCreateFlow()}
        />
      </div>

      {/* ── Detail Drawer ── */}
      <Sheet 
        open={!!selectedTemplateId} 
        onOpenChange={(open) => {
          if (!open) setSelectedTemplate(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto bg-white border-l shadow-2xl">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-xl font-black tracking-tight text-foreground uppercase">
              Detalhes do Template
            </SheetTitle>
          </SheetHeader>
          
          <TemplateDetailPanel
            template={selectedTemplate}
            onApply={handleApply}
            onCustomize={handleCustomize}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </SheetContent>
      </Sheet>

      {/* ── Overlaid flows ── */}
      {applyFlowOpen && selectedTemplate && (
        <TemplateApplyFlow
          template={selectedTemplate}
          open={applyFlowOpen}
          onOpenChange={(open) => { if (!open) closeApplyFlow(); }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["exercise-plans"] });
          }}
        />
      )}

      <TemplateCreateFlow
        open={createFlowOpen}
        onOpenChange={(open) => { if (!open) closeCreateFlow(); }}
        sourceTemplate={createFlowSourceTemplate}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["templates"] });
        }}
      />

      <TemplateCreateFlow
        open={editFlowOpen}
        onOpenChange={(open) => {
          setEditFlowOpen(open);
          if (!open) setEditingTemplate(null);
        }}
        editTemplate={editingTemplate ?? undefined}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["templates"] });
        }}
      />
    </div>
  );
}
