import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
  Clock,
  Repeat,
  RotateCcw,
  Stethoscope,
  Info,
  CheckCircle2,
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function NoSelectionState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 text-center text-muted-foreground">
      <div className="bg-muted p-6 rounded-full mb-6">
        <LayoutTemplate className="h-16 w-16 opacity-20" />
      </div>
      <p className="text-lg font-black tracking-tight uppercase text-foreground">Selecione um template</p>
      <p className="text-sm mt-2 max-w-[250px] opacity-70">
        Escolha um protocolo na biblioteca ao lado para visualizar os detalhes clínicos.
      </p>
    </div>
  );
}

function NoExercisesState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-muted/30">
      <Dumbbell className="h-10 w-10 mb-4 text-muted-foreground/40" />
      <p className="text-sm font-bold text-foreground uppercase tracking-tight">Sem exercícios cadastrados</p>
      <p className="text-xs mt-1 text-muted-foreground">Este protocolo base ainda não possui movimentos vinculados.</p>
    </div>
  );
}

function EmptyContent({ label, icon: Icon = Info }: { label: string; icon?: any }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-muted-foreground/10 italic">
      <Icon className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
      <p className="text-xs text-muted-foreground leading-relaxed">
        {label}
      </p>
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

const POS_OP_PHASES = [
  { label: "Fase 1 — Proteção", weeks: "1–4", desc: "Controle de dor e edema, mobilização passiva suave." },
  { label: "Fase 2 — Mobilização", weeks: "5–8", desc: "Ganho de amplitude ativa, fortalecimento inicial sem impacto." },
  { label: "Fase 3 — Fortalecimento", weeks: "9–16", desc: "Fortalecimento progressivo, propriocepção e equilíbrio." },
  { label: "Fase 4 — Retorno", weeks: "17+", desc: "Atividades funcionais complexas e retorno gradual ao esporte/trabalho." },
];

function ExerciseTimeline() {
  return (
    <div className="space-y-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
        <CalendarDays className="h-4 w-4" />
        Sugerido: Progressão Semanal
      </div>

      <div className="relative pl-4 space-y-4 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-primary/20">
        {POS_OP_PHASES.map((p, i) => (
          <div key={i} className="relative flex gap-4 items-start">
            <div className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-white shadow-sm" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{p.label}</span>
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-bold uppercase border-primary/30 text-primary bg-primary/5">Sem. {p.weeks}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function TemplateDetailPanel({
  template,
  onApply,
  onCustomize,
  onEdit,
  onDelete,
}: TemplateDetailPanelProps) {
  const [activeTab, setActiveTab] = useState("exercicios");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!template) return <NoSelectionState />;

  const isSystem = template.templateType === "system";

  return (
    <div className="flex flex-col h-full gap-6">
      {/* ── Delete Dialog ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tight uppercase">Excluir template?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Esta ação removerá o template permanentemente da biblioteca. Planos de pacientes que já utilizam este template não serão alterados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full font-bold"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Top Header Section ── */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <h2 className="text-2xl font-black leading-[1.1] tracking-tighter text-foreground uppercase italic">
              {template.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isSystem ? "secondary" : "outline"} className={`text-[10px] font-black uppercase tracking-tight ${!isSystem ? "text-green-700 border-green-200 bg-green-50" : "bg-blue-50 text-blue-700 border-blue-100"}`}>
                {isSystem ? "Sistema FisioFlow" : "Personalizado Clínica"}
              </Badge>
              {template.condition_name && (
                <span className="text-xs font-bold text-muted-foreground/80 flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" />
                  {template.condition_name}
                </span>
              )}
            </div>
          </div>
          
          {template.evidence_level && (
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-50 border border-amber-100 shadow-sm shrink-0">
              <span className="text-[9px] font-black uppercase text-amber-600/70 tracking-widest">Evidência</span>
              <span className="text-xl font-black text-amber-700 leading-none">{template.evidence_level}</span>
            </div>
          )}
        </div>

        {template.description && (
          <p className="text-sm text-muted-foreground leading-relaxed font-medium bg-muted/30 p-3 rounded-xl border border-muted-foreground/5">
            {template.description}
          </p>
        )}

        {/* Action Bar */}
        <div className="flex flex-wrap gap-2.5 pt-2">
          <Button onClick={onApply} className="h-10 px-6 gap-2 font-black uppercase tracking-tight rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all">
            <Play className="h-4 w-4 fill-current" />
            Aplicar a Paciente
          </Button>

          {isSystem ? (
            <Button variant="outline" onClick={onCustomize} className="h-10 px-5 gap-2 font-bold rounded-full border-muted-foreground/20 hover:bg-muted">
              <Edit className="h-4 w-4 text-muted-foreground" />
              Customizar Cópia
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onEdit} className="h-10 px-5 gap-2 font-bold rounded-full border-muted-foreground/20">
                <Edit className="h-4 w-4 text-muted-foreground" />
                Editar
              </Button>
              <Button
                variant="ghost"
                onClick={() => setDeleteDialogOpen(true)}
                className="h-10 w-10 p-0 rounded-full text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* ── Tabs Content ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start h-11 flex-wrap gap-1 bg-transparent p-0 border-b border-muted rounded-none mb-4">
          {[
            { id: "exercicios", icon: Dumbbell, label: "Exercícios" },
            { id: "clinico", icon: FileText, label: "Clínico" },
            { id: "contraindicacoes", icon: AlertTriangle, label: "Segurança" },
            { id: "progressao", icon: TrendingUp, label: "Evolução" },
            { id: "referencias", icon: BookOpen, label: "Referências" },
          ].map((tab) => (
            <TabsTrigger 
              key={tab.id}
              value={tab.id} 
              className="text-[11px] font-black uppercase tracking-tighter gap-1.5 h-11 px-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent rounded-none transition-all"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
          {/* 1. EXERCÍCIOS */}
          <TabsContent value="exercicios" className="mt-0 focus-visible:ring-0">
            {template.exerciseCount === 0 ? (
              <NoExercisesState />
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-muted/20 p-3 rounded-xl border border-muted-foreground/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-black uppercase text-foreground">
                      {template.exerciseCount} Prescrições Base
                    </span>
                  </div>
                  {template.estimated_duration && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {template.estimated_duration} MIN
                    </div>
                  )}
                </div>

                {template.patientProfile === "pos_operatorio" && <ExerciseTimeline />}

                <div className="grid grid-cols-1 gap-3">
                  {template.items?.map((item, idx) => (
                    <div key={item.id || idx} className="group flex flex-col p-4 rounded-2xl border-2 border-muted hover:border-primary/20 bg-card transition-all">
                      <div className="flex items-start gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted font-black text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-black uppercase leading-tight tracking-tight text-foreground line-clamp-2">
                            {item.exercise?.name || "Exercício sem nome"}
                          </h5>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                            {item.sets && (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                <RotateCcw className="h-3.5 w-3.5 text-primary/60" />
                                {item.sets} SÉRIES
                              </div>
                            )}
                            {item.repetitions && (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                <Repeat className="h-3.5 w-3.5 text-primary/60" />
                                {item.repetitions} REPS
                              </div>
                            )}
                            {item.duration && (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                <Clock className="h-3.5 w-3.5 text-primary/60" />
                                {item.duration} SEG
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {(item.notes || item.clinical_notes) && (
                        <div className="mt-4 pt-3 border-t border-dashed border-muted-foreground/10">
                          <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                            "{item.notes || item.clinical_notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* 2. CLÍNICO */}
          <TabsContent value="clinico" className="mt-0 focus-visible:ring-0">
            <div className="space-y-6">
              <div className="bg-primary/[0.03] p-5 rounded-2xl border-2 border-primary/10">
                <h4 className="text-[10px] font-black uppercase text-primary tracking-widest mb-3 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Raciocínio Clínico e Orientações
                </h4>
                {template.clinical_notes ? (
                  <p className="text-sm text-foreground leading-relaxed font-medium whitespace-pre-wrap">
                    {template.clinical_notes}
                  </p>
                ) : (
                  <EmptyContent label="Nenhuma nota clínica cadastrada para este protocolo." />
                )}
              </div>
            </div>
          </TabsContent>

          {/* 3. SEGURANÇA (CONTRAINDICAÇÕES) */}
          <TabsContent value="contraindicacoes" className="mt-0 space-y-5 focus-visible:ring-0">
            <div className="space-y-4">
              <div className="bg-destructive/5 p-5 rounded-2xl border-2 border-destructive/10">
                <h4 className="text-[10px] font-black uppercase text-destructive tracking-widest mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Contraindicações Absolutas
                </h4>
                {template.contraindications ? (
                  <p className="text-sm text-foreground leading-relaxed font-semibold">
                    {template.contraindications}
                  </p>
                ) : (
                  <EmptyContent label="Nenhuma contraindicação listada." icon={CheckCircle2} />
                )}
              </div>

              {template.precautions && (
                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200">
                  <h4 className="text-[10px] font-black uppercase text-amber-700 tracking-widest mb-3 flex items-center gap-2">
                    <Info className="h-3.5 w-3.5" />
                    Precauções e Cuidados
                  </h4>
                  <p className="text-sm text-amber-900 leading-relaxed font-medium italic">
                    {template.precautions}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 4. EVOLUÇÃO (PROGRESSÃO) */}
          <TabsContent value="progressao" className="mt-0 focus-visible:ring-0">
            <div className="bg-green-50 p-5 rounded-2xl border-2 border-green-100">
              <h4 className="text-[10px] font-black uppercase text-green-700 tracking-widest mb-3 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Critérios de Progressão
              </h4>
              {template.progression_notes ? (
                <p className="text-sm text-green-900 leading-relaxed font-bold">
                  {template.progression_notes}
                </p>
              ) : (
                <EmptyContent label="Critérios de alta ou progressão de fase não definidos." />
              )}
            </div>
          </TabsContent>

          {/* 5. REFERÊNCIAS */}
          <TabsContent value="referencias" className="mt-0 focus-visible:ring-0">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Base Científica</h4>
              {template.bibliographic_references && template.bibliographic_references.length > 0 ? (
                <div className="space-y-3">
                  {template.bibliographic_references.map((ref, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted/20 border border-muted-foreground/10">
                      <div className="h-5 w-5 shrink-0 flex items-center justify-center rounded bg-muted-foreground/10 text-[10px] font-black">{i+1}</div>
                      <p className="text-xs font-medium text-muted-foreground leading-snug">
                        {ref}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyContent label="Nenhuma referência bibliográfica anexada a este template." icon={BookOpen} />
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

