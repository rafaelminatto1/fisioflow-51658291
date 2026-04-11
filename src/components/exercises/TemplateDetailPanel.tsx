import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dumbbell,
  FlaskConical,
  Play,
  Edit,
  Trash2,
  FileText,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  LayoutTemplate,
  CalendarDays,
} from "lucide-react";
import type { ExerciseTemplate } from "@/types/workers";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TemplateDetailPanelProps {
  template: ExerciseTemplate | null;
  onApply: () => void;
  onCustomize: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// ─── Empty state (no template selected) ──────────────────────────────────────

function NoSelectionState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 text-center text-muted-foreground">
      <LayoutTemplate className="h-12 w-12 mb-4 opacity-30" />
      <p className="text-sm font-medium">Selecione um template para ver os detalhes</p>
      <p className="text-xs mt-1 opacity-70">
        Escolha um template na lista ao lado
      </p>
    </div>
  );
}

// ─── Empty exercises state ────────────────────────────────────────────────────

function NoExercisesState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
      <Dumbbell className="h-8 w-8 mb-3 opacity-30" />
      <p className="text-sm font-medium">Nenhum exercício cadastrado</p>
      <p className="text-xs mt-1">Este template ainda não possui exercícios</p>
    </div>
  );
}

// ─── Empty content state ──────────────────────────────────────────────────────

function EmptyContent({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted-foreground italic py-4">
      {label}
    </p>
  );
}

// ─── ExerciseTimeline (pós-operatório only) ───────────────────────────────────

interface TimelinePhase {
  label: string;
  weekStart: number;
  weekEnd: number;
  description: string;
}

const POS_OP_PHASES: TimelinePhase[] = [
  { label: "Fase 1 — Proteção", weekStart: 1, weekEnd: 4, description: "Controle de dor e edema, mobilização passiva" },
  { label: "Fase 2 — Mobilização", weekStart: 5, weekEnd: 8, description: "Ganho de amplitude, fortalecimento inicial" },
  { label: "Fase 3 — Fortalecimento", weekStart: 9, weekEnd: 16, description: "Fortalecimento progressivo, propriocepção" },
  { label: "Fase 4 — Retorno Funcional", weekStart: 17, weekEnd: 24, description: "Atividades funcionais, retorno às atividades" },
];

export function ExerciseTimeline() {
  return (
    <div className="space-y-3" data-testid="exercise-timeline">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CalendarDays className="h-4 w-4 text-primary" />
        <span>Protocolo com progressão por semanas</span>
      </div>

      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" aria-hidden="true" />

        <ol className="space-y-3">
          {POS_OP_PHASES.map((phase, index) => (
            <li key={index} className="flex gap-3 items-start">
              {/* Phase dot */}
              <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/30 mt-0.5">
                <span className="text-[10px] font-bold text-primary">{index + 1}</span>
              </div>

              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">{phase.label}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                    Sem. {phase.weekStart}–{phase.weekEnd}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {phase.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-[11px] text-muted-foreground italic border-t pt-2">
        As fases são referências clínicas gerais. Os exercícios específicos de cada semana serão exibidos ao abrir o template completo.
      </p>
    </div>
  );
}

// ─── TemplateDetailPanel ──────────────────────────────────────────────────────

export function TemplateDetailPanel({
  template,
  onApply,
  onCustomize,
  onEdit,
  onDelete,
}: TemplateDetailPanelProps) {
  const [activeTab, setActiveTab] = useState("exercicios");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!template) {
    return <NoSelectionState />;
  }

  const isSystem = template.templateType === "system";

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── Delete Confirmation AlertDialog ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Tem certeza que deseja excluir o template{" "}
                  <strong>{template.name}</strong>?
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Se houver planos de exercícios ativos vinculados a este
                    template, eles não serão afetados, mas o template não
                    estará mais disponível para novos planos.
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* ── Header ── */}
      <div className="space-y-2">
        <div className="flex items-start gap-2 flex-wrap">
          <h2 className="text-lg font-bold leading-tight flex-1">{template.name}</h2>
          <div className="flex items-center gap-1.5 shrink-0">
            {isSystem ? (
              <Badge variant="secondary" className="text-xs">
                Sistema
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-xs text-green-700 border-green-600"
              >
                Personalizado
              </Badge>
            )}
            {template.evidenceLevel && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <FlaskConical className="h-3 w-3" />
                Evidência {template.evidenceLevel}
              </Badge>
            )}
          </div>
        </div>

        {template.conditionName && (
          <p className="text-sm text-muted-foreground">{template.conditionName}</p>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="flex flex-wrap gap-2">
        {/* Always visible */}
        <Button size="sm" onClick={onApply} className="gap-1.5">
          <Play className="h-3.5 w-3.5" />
          Aplicar a Paciente
        </Button>

        {/* System only */}
        {isSystem && (
          <Button size="sm" variant="outline" onClick={onCustomize} className="gap-1.5">
            <Edit className="h-3.5 w-3.5" />
            Editar
          </Button>
        )}

        {/* Custom only */}
        {!isSystem && (
          <>
            <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5">
              <Edit className="h-3.5 w-3.5" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </Button>
          </>
        )}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start h-auto flex-wrap gap-0.5 bg-muted/50 p-1">
          <TabsTrigger value="exercicios" className="text-xs gap-1.5">
            <Dumbbell className="h-3.5 w-3.5" />
            Exercícios
          </TabsTrigger>
          <TabsTrigger value="clinico" className="text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Clínico
          </TabsTrigger>
          <TabsTrigger value="contraindicacoes" className="text-xs gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Contraindicações
          </TabsTrigger>
          <TabsTrigger value="progressao" className="text-xs gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Progressão
          </TabsTrigger>
          <TabsTrigger value="referencias" className="text-xs gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Referências
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto pt-3">
          {/* Exercícios */}
          <TabsContent value="exercicios" className="mt-0">
            {template.exerciseCount === 0 ? (
              <NoExercisesState />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Dumbbell className="h-4 w-4" />
                  <span>
                    {template.exerciseCount} exercício
                    {template.exerciseCount !== 1 ? "s" : ""} neste template
                  </span>
                </div>

                {template.patientProfile === "pos_operatorio" && (
                  <ExerciseTimeline />
                )}
              </div>
            )}
          </TabsContent>

          {/* Clínico */}
          <TabsContent value="clinico" className="mt-0">
            {template.clinicalNotes ? (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {template.clinicalNotes}
              </p>
            ) : (
              <EmptyContent label="Nenhuma nota clínica cadastrada." />
            )}
          </TabsContent>

          {/* Contraindicações */}
          <TabsContent value="contraindicacoes" className="mt-0 space-y-4">
            {template.contraindications ? (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Contraindicações
                </h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {template.contraindications}
                </p>
              </div>
            ) : (
              <EmptyContent label="Nenhuma contraindicação cadastrada." />
            )}
            {template.precautions && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Precauções
                </h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {template.precautions}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Progressão */}
          <TabsContent value="progressao" className="mt-0">
            {template.progressionNotes ? (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {template.progressionNotes}
              </p>
            ) : (
              <EmptyContent label="Nenhuma nota de progressão cadastrada." />
            )}
          </TabsContent>

          {/* Referências */}
          <TabsContent value="referencias" className="mt-0">
            {template.bibliographicReferences && template.bibliographicReferences.length > 0 ? (
              <ol className="space-y-2 list-decimal list-inside">
                {template.bibliographicReferences.map((ref, i) => (
                  <li key={i} className="text-sm leading-relaxed text-muted-foreground">
                    {ref}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyContent label="Nenhuma referência bibliográfica cadastrada." />
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
