import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { templatesApi } from "@/api/v2";
import { useTemplateUIStore } from "@/stores/useTemplateUIStore";
import { TemplateSidebar } from "./TemplateSidebar";
import { TemplateDetailPanel } from "./TemplateDetailPanel";
import { TemplateApplyFlow } from "./TemplateApplyFlow";
import { TemplateCreateFlow } from "./TemplateCreateFlow";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LayoutTemplate, Sparkles, Plus } from "lucide-react";
import type { ExerciseTemplate } from "@/types/workers";

// ─── Empty state CTA (shown when org has no custom templates) ─────────────────

interface EmptyStateCTAProps {
  onExploreSystem: () => void;
  onCreateFirst: () => void;
}

function EmptyStateCTA({ onExploreSystem, onCreateFirst }: EmptyStateCTAProps) {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 mb-4">
      <div className="flex flex-col items-center text-center gap-3">
        <LayoutTemplate className="h-10 w-10 text-muted-foreground/50" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            Sua organização ainda não tem templates personalizados
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Explore os templates do sistema como ponto de partida ou crie o seu próprio protocolo clínico.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button size="sm" variant="outline" onClick={onExploreSystem} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Explorar Templates do Sistema
          </Button>
          <Button size="sm" onClick={onCreateFirst} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Criar Meu Primeiro Template
          </Button>
        </div>
      </div>
    </div>
  );
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

  // Mobile: show detail panel when a template is selected
  const showDetailOnMobile = !!selectedTemplateId;

  return (
    <div className="h-full flex flex-col">
      {/* Empty state CTA — shown above the list when no custom templates exist */}
      {!hasCustomTemplates && !loading && (
        <EmptyStateCTA
          onExploreSystem={handleExploreSystem}
          onCreateFirst={handleCreateFirst}
        />
      )}

      {/* Split-view layout */}
      <div className="flex-1 flex min-h-0 gap-0 overflow-hidden rounded-lg border bg-background">
        {/* ── Sidebar (left) — hidden on mobile when detail is open ── */}
        <div
          className={`
            flex flex-col border-r
            w-full lg:w-[340px] xl:w-[380px] shrink-0
            ${showDetailOnMobile ? "hidden lg:flex" : "flex"}
          `}
        >
          <div className="flex-1 overflow-hidden p-4">
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
        </div>

        {/* ── Detail panel (right) — full width on mobile when open ── */}
        <div
          className={`
            flex-1 flex flex-col min-w-0 overflow-hidden
            ${showDetailOnMobile ? "flex" : "hidden lg:flex"}
          `}
        >
          {/* Mobile back button */}
          {showDetailOnMobile && (
            <div className="flex items-center gap-2 px-4 py-2 border-b lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTemplate(null)}
                className="gap-1.5 -ml-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            <TemplateDetailPanel
              template={selectedTemplate}
              onApply={handleApply}
              onCustomize={handleCustomize}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </div>

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
