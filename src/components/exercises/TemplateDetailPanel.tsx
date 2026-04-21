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
import { cn } from "@/lib/utils";

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
      <p className="text-sm font-bold text-foreground uppercase tracking-tight">Nenhum exercício cadastrado</p>
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
    <div data-testid="exercise-timeline" className="space-y-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-muted/50 to-muted/20 border border-muted-foreground/10 p-6">
        {/* Abstract background decoration */}
        <div className="absolute -top-10 -right-10 h-40 w-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isSystem ? "secondary" : "outline"} className={cn("text-[9px] h-5 font-black uppercase tracking-widest", !isSystem ? "text-emerald-700 border-emerald-200 bg-emerald-100/50" : "bg-blue-100/50 text-blue-700 border-blue-200")}>
                  {isSystem ? "Sistema FisioFlow" : "Personalizado Clínica"}
                </Badge>
                {template.conditionName && (
                  <Badge variant="outline" className="text-[9px] h-5 font-black uppercase tracking-widest bg-white/50 border-muted-foreground/10 text-muted-foreground flex items-center gap-1">
                    <Stethoscope className="h-2.5 w-2.5" />
                    {template.conditionName}
                  </Badge>
                )}
              </div>
              
              <h2 className="text-3xl font-black leading-[1] tracking-tighter text-foreground uppercase italic drop-shadow-sm">
                {template.name}
              </h2>
            </div>
            
            {template.evidenceLevel && (
              <div className="flex flex-col items-center justify-center h-20 w-16 rounded-2xl bg-white border border-amber-100 shadow-lg shadow-amber-500/10 shrink-0">
                <span className="text-[8px] font-black uppercase text-amber-500/60 tracking-[0.2em] mb-1">Evidence</span>
                <span className="text-3xl font-black text-amber-600 leading-none">{template.evidenceLevel}</span>
              </div>
            )}
          </div>

          {template.description && (
            <p className="text-sm text-muted-foreground leading-relaxed font-medium pl-4 border-l-2 border-primary/20">
              {template.description}
            </p>
          )}

          {/* Action Bar */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={onApply} size="lg" className="h-12 px-8 gap-3 font-black uppercase tracking-tighter rounded-2xl shadow-xl shadow-primary/25 active:scale-95 transition-all">
              <Play className="h-4 w-4 fill-current" />
              Aplicar a Paciente
            </Button>

            <div className="flex gap-2">
              {isSystem ? (
                <Button variant="secondary" onClick={onCustomize} className="h-12 px-6 gap-2 font-bold rounded-2xl bg-white border border-muted-foreground/10 hover:bg-muted/50">
                  <Edit className="h-4 w-4 text-muted-foreground" />
                  Personalizar
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={onEdit} className="h-12 px-6 gap-2 font-bold rounded-2xl bg-white border border-muted-foreground/10">
                    <Edit className="h-4 w-4 text-muted-foreground" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="h-12 w-12 rounded-2xl text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs Content ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 px-1">
        <TabsList className="w-full justify-start h-12 gap-1 bg-muted/30 p-1.5 rounded-2xl mb-6">
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
              className="text-[10px] font-black uppercase tracking-tighter gap-2 h-full px-4 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-xl transition-all"
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
          {/* 1. EXERCÍCIOS */}
          <TabsContent value="exercicios" className="mt-0 focus-visible:ring-0">
            {template.exerciseCount === 0 ? (
              <NoExercisesState />
            ) : (
              <div className="space-y-8">
                <div className="flex items-center justify-between bg-primary/[0.03] p-4 rounded-2xl border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs font-black uppercase text-foreground tracking-widest">
                      {template.exerciseCount} Prescrições Base
                    </span>
                  </div>
                  {template.estimatedDuration && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-muted-foreground/10 text-[10px] font-black text-muted-foreground tracking-widest">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      {template.estimatedDuration} MIN TOTAL
                    </div>
                  )}
                </div>

                {template.patientProfile === "pos_operatorio" && <ExerciseTimeline />}

                <div className="grid grid-cols-1 gap-4">
                  {template.items?.map((item, idx) => (
                    <div key={item.id || idx} className="group relative flex flex-col sm:flex-row gap-6 p-5 rounded-[2rem] border-2 border-muted hover:border-primary/20 bg-card transition-all hover:shadow-2xl hover:shadow-primary/5">
                      {/* Thumbnail Container */}
                      <div className="relative flex-shrink-0 self-center sm:self-start">
                        <div className="h-28 w-28 rounded-2xl bg-muted overflow-hidden border border-muted-foreground/10 group-hover:border-primary/20 transition-all shadow-sm">
                          {item.exercise?.imageUrl ? (
                            <img 
                              src={item.exercise.imageUrl} 
                              alt={item.exercise.name}
                              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center font-black text-3xl text-muted-foreground/20 uppercase">
                              {idx + 1}
                            </div>
                          )}
                        </div>
                        
                        {/* Exercise Number Badge */}
                        <div className="absolute -top-3 -left-3 h-9 w-9 flex items-center justify-center rounded-2xl bg-primary text-sm font-black text-white shadow-xl ring-4 ring-white group-hover:scale-110 transition-transform">
                          {idx + 1}
                        </div>

                        {/* Video Overlay if available */}
                        {item.exercise?.videoUrl && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                              <Play className="h-4 w-4 text-primary fill-current" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content Container */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h5 className="text-lg font-black uppercase leading-tight tracking-tighter text-foreground group-hover:text-primary transition-colors italic">
                          {item.exercise?.name || item.exerciseId || "Exercício"}
                        </h5>
                        
                        {/* Parameters Grid */}
                        <div className="flex flex-wrap items-center gap-3 mt-4">
                          {item.sets && (
                            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-primary/[0.03] border border-primary/10 transition-colors group-hover:bg-primary/5">
                              <RotateCcw className="h-3.5 w-3.5 text-primary" />
                              <div className="flex flex-col leading-none">
                                <span className="text-[8px] font-black uppercase text-primary/60 tracking-widest mb-0.5">Séries</span>
                                <span className="text-sm font-black text-primary">{item.sets}</span>
                              </div>
                            </div>
                          )}
                          {item.repetitions && (
                            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-blue-500/[0.03] border border-blue-500/10 transition-colors group-hover:bg-blue-500/5">
                              <Repeat className="h-3.5 w-3.5 text-blue-500" />
                              <div className="flex flex-col leading-none">
                                <span className="text-[8px] font-black uppercase text-blue-500/60 tracking-widest mb-0.5">Repetições</span>
                                <span className="text-sm font-black text-blue-500">{item.repetitions}</span>
                              </div>
                            </div>
                          )}
                          {item.duration && (
                            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-amber-500/[0.03] border border-amber-500/10 transition-colors group-hover:bg-amber-500/5">
                              <Clock className="h-3.5 w-3.5 text-amber-500" />
                              <div className="flex flex-col leading-none">
                                <span className="text-[8px] font-black uppercase text-amber-500/60 tracking-widest mb-0.5">Tempo</span>
                                <span className="text-sm font-black text-amber-500">{item.duration}s</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {(item.notes || item.clinicalNotes) && (
                          <div className="mt-5 p-3 rounded-xl bg-muted/30 border-l-2 border-primary/30">
                            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium italic">
                              "{item.notes || item.clinicalNotes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* 2. CLÍNICO */}
          <TabsContent value="clinico" className="mt-0 focus-visible:ring-0">
            <div className="space-y-6 pb-6">
              <div className="bg-primary/[0.03] p-6 rounded-3xl border-2 border-primary/10">
                <h4 className="text-[10px] font-black uppercase text-primary tracking-widest mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Raciocínio Clínico e Orientações
                </h4>
                {template.clinicalNotes ? (
                  <p className="text-sm text-foreground leading-relaxed font-medium whitespace-pre-wrap">
                    {template.clinicalNotes}
                  </p>
                ) : (
                  <EmptyContent label="Nenhuma nota clínica cadastrada para este protocolo." />
                )}
              </div>
            </div>
          </TabsContent>

          {/* 3. SEGURANÇA (CONTRAINDICAÇÕES) */}
          <TabsContent value="contraindicacoes" className="mt-0 space-y-6 focus-visible:ring-0 pb-6">
            <div className="space-y-4">
              <div className="bg-destructive/[0.03] p-6 rounded-3xl border-2 border-destructive/10">
                <h4 className="text-[10px] font-black uppercase text-destructive tracking-widest mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Contraindicações Absolutas
                </h4>
                {template.contraindications ? (
                  <p className="text-sm text-foreground leading-relaxed font-bold text-destructive">
                    {template.contraindications}
                  </p>
                ) : (
                  <EmptyContent label="Nenhuma contraindicação listada." icon={CheckCircle2} />
                )}
              </div>

              {template.precautions && (
                <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-200">
                  <h4 className="text-[10px] font-black uppercase text-amber-700 tracking-widest mb-4 flex items-center gap-2">
                    <Info className="h-4 w-4" />
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
          <TabsContent value="progressao" className="mt-0 focus-visible:ring-0 pb-6">
            <div className="bg-emerald-50/50 p-6 rounded-3xl border-2 border-emerald-100">
              <h4 className="text-[10px] font-black uppercase text-emerald-700 tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Critérios de Progressão
              </h4>
              {template.progressionNotes ? (
                <p className="text-sm text-emerald-900 leading-relaxed font-bold">
                  {template.progressionNotes}
                </p>
              ) : (
                <EmptyContent label="Critérios de alta ou progressão de fase não definidos." />
              )}
            </div>
          </TabsContent>

          {/* 5. REFERÊNCIAS */}
          <TabsContent value="referencias" className="mt-0 focus-visible:ring-0 pb-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Base Científica</h4>
              {template.bibliographicReferences && template.bibliographicReferences.length > 0 ? (
                <div className="space-y-3">
                  {template.bibliographicReferences.map((ref, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-2xl bg-muted/30 border border-muted-foreground/10 hover:bg-muted/50 transition-colors">
                      <div className="h-6 w-6 shrink-0 flex items-center justify-center rounded-lg bg-primary/10 text-primary text-[10px] font-black">{i+1}</div>
                      <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
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
