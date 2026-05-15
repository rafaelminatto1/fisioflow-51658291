/**
 * NotionEvolutionPanel - Improved V2 Evolution editor
 *
 * Notion/Evernote-style block editor for clinical evolutions with
 * enhanced UX/UI including:
 *   - Better visual hierarchy and spacing
 *   - Smooth animations and transitions
 *   - Professional color scheme
 *   - Improved responsive design
 *   - Enhanced accessibility
 *   - Micro-interactions
 */
import React, { useCallback, useState } from "react";
import {
  FileText,
  MessageCircle,
  StickyNote,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  History,
  Activity,
  Ruler,
  Home,
  Paperclip,
  Library,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RichTextBlock } from "./RichTextBlock";
import { EvolutionBlockV3 } from "../v3-unified/EvolutionBlockV3";
import { EvolutionItemV3 } from "../v3-unified/types";
import { PainLevelBlock } from "./PainLevelBlock";
import { HomeCareBlock } from "./HomeCareBlock";
import { AttachmentsBlock } from "./AttachmentsBlock";
import { MeasurementsBlock } from "./MeasurementsBlock";
import type { EvolutionV2Data } from "./types";

interface NotionEvolutionPanelProps {
  data: EvolutionV2Data;
  onChange: (data: EvolutionV2Data) => void;
  onSave?: () => void;
  isSaving?: boolean;
  disabled?: boolean;
  autoSaveEnabled?: boolean;
  lastSaved?: Date | null;
  className?: string;
  patientId?: string;
  evolutionId?: string;
}

export const NotionEvolutionPanel: React.FC<NotionEvolutionPanelProps> = ({
  data,
  onChange,
  onSave,
  isSaving = false,
  disabled = false,
  autoSaveEnabled = false,
  lastSaved,
  className,
  patientId,
  evolutionId,
}) => {
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

  // Migration logic (run once if unifiedItems is empty but legacy items exist)
  React.useEffect(() => {
    if ((!data.unifiedItems || data.unifiedItems.length === 0) && (data.procedures?.length > 0 || data.exercises?.length > 0)) {
      const migratedItems: EvolutionItemV3[] = [];
      
      // Add procedures
      if (data.procedures?.length > 0) {
        data.procedures.forEach(p => {
          migratedItems.push({
            id: p.id,
            name: p.name,
            completed: p.completed,
            type: "procedure",
            notes: p.notes,
            intensity: p.intensity,
            category: p.category
          });
        });
      }
      
      // Add exercises
      if (data.exercises?.length > 0) {
        data.exercises.forEach(e => {
          migratedItems.push({
            id: e.id,
            name: e.name,
            completed: e.completed,
            type: "exercise",
            prescription: e.prescription,
            patientFeedback: e.patientFeedback?.notes || "",
            difficulty: e.difficulty
          });
        });
      }
      
      if (migratedItems.length > 0) {
        onChange({ ...data, unifiedItems: migratedItems });
      }
    }
  }, []);

  const handleFieldChange = useCallback(
    <K extends keyof EvolutionV2Data>(field: K, value: EvolutionV2Data[K]) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange],
  );

  return (
    <Card
      className={cn(
        "h-full flex flex-col border-none shadow-none bg-background overflow-hidden",
        className,
      )}
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
          
          {/* Main Column - Free Text Evolution */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Evolução Clínica</h2>
                  <p className="text-sm text-muted-foreground">Texto livre formatado</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {autoSaveEnabled && lastSaved && (
                  <Badge variant="outline" className="text-xs h-8 px-3 gap-2 rounded-xl border-green-500/20 bg-green-500/10 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">Salvo às {lastSaved.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </Badge>
                )}
                {onSave && (
                  <Button
                    onClick={onSave}
                    disabled={disabled || isSaving}
                    className="gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-semibold"
                    size="lg"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Button>
                )}
              </div>
            </div>

            <div className="min-h-[400px] rounded-3xl border border-border/50 bg-background/50 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col">
              <RichTextBlock
                title="" // Removed title to make it cleaner
                placeholder="Descreva a evolução da sessão livremente... (Pressione '/' para comandos)"
                value={data.evolutionText}
                onValueChange={(val) => handleFieldChange("evolutionText", val)}
                disabled={disabled}
                className="h-full border-none shadow-none bg-transparent"
                accentColor="violet"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Vermelho: EVA */}
            <div className="rounded-3xl bg-red-500/5 border border-red-500/10 p-5 transition-all hover:bg-red-500/10 overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-red-500/20">
                  <Activity className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-semibold text-red-900 dark:text-red-300 text-sm">Dor (EVA)</h3>
              </div>
              <div className="flex-1 -mx-4 -mb-4">
                <PainLevelBlock
                  painLevel={data.painLevel}
                  painLocation={data.painLocation}
                  onPainLevelChange={(level) => handleFieldChange("painLevel", level)}
                  onPainLocationChange={(location) => handleFieldChange("painLocation", location)}
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Card Amarelo: Observações */}
            <div className="rounded-3xl bg-amber-500/5 border border-amber-500/10 p-5 transition-all hover:bg-amber-500/10 overflow-hidden flex flex-col">
               <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-amber-500/20">
                  <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-300 text-sm">Observações</h3>
              </div>
              <div className="flex-1 -mx-4 -mb-4">
                <RichTextBlock
                  title=""
                  placeholder="Notas rápidas..."
                  value={data.observations}
                  onValueChange={(val) => handleFieldChange("observations", val)}
                  disabled={disabled}
                  className="h-full border-none shadow-none bg-transparent"
                  accentColor="amber"
                />
              </div>
            </div>
          </div>

          {/* Card Azul: Histórico */}
          <div className="rounded-3xl bg-blue-500/5 border border-blue-500/10 p-5 transition-all hover:bg-blue-500/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-blue-500/20">
                <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-300">Histórico de Evoluções</h3>
            </div>
            <div className="text-sm text-blue-800/60 dark:text-blue-200/60 p-4 text-center rounded-2xl bg-blue-500/5 border border-blue-500/10 border-dashed">
              Nenhuma evolução anterior encontrada.
            </div>
          </div>

          {/* Card Verde: Procedimentos e Exercícios */}
          <div className="rounded-3xl bg-emerald-500/5 border border-emerald-500/10 p-5 transition-all hover:bg-emerald-500/10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20">
                  <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-300">Intervenções</h3>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full border-emerald-500/30 text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-800"
                onClick={() => setIsLibraryModalOpen(true)}
                disabled={disabled}
              >
                <Library className="h-4 w-4 mr-2" />
                Biblioteca
              </Button>
            </div>
            <div className="-mx-5 -mb-5 px-5 pb-5 bg-background/40 rounded-b-3xl mt-2">
              <EvolutionBlockV3
                items={data.unifiedItems || []}
                onChange={(items) => handleFieldChange("unifiedItems", items)}
                type="unified"
                disabled={disabled}
              />
            </div>
          </div>

          {/* Card Rosa: Medições */}
          <div className="rounded-3xl bg-pink-500/5 border border-pink-500/10 p-5 transition-all hover:bg-pink-500/10 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-pink-500/20">
                <Ruler className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="font-semibold text-pink-900 dark:text-pink-300">Medições</h3>
            </div>
            <div className="-mx-5 -mb-5 px-5 pb-5 mt-2">
              <MeasurementsBlock
                measurements={data.measurements || []}
                onChange={(meas) => handleFieldChange("measurements", meas)}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Card Cinza: Home Care */}
          <div className="rounded-3xl bg-zinc-500/5 border border-zinc-500/10 p-5 transition-all hover:bg-zinc-500/10 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-zinc-500/20">
                  <Home className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-300">Exercícios para Casa</h3>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full border-zinc-500/30 text-zinc-700 bg-zinc-500/10 hover:bg-zinc-500/20 hover:text-zinc-800"
                onClick={() => setIsLibraryModalOpen(true)}
                disabled={disabled}
              >
                <Library className="h-4 w-4 mr-2" />
                Biblioteca
              </Button>
            </div>
            <div className="-mx-5 -mb-5 px-5 pb-5 mt-2">
              <HomeCareBlock
                value={data.homeCareExercises || ""}
                onChange={(val) => handleFieldChange("homeCareExercises", val)}
                disabled={disabled}
                className="border-none shadow-none bg-background/50 rounded-2xl"
              />
            </div>
          </div>

          {/* Card Preto: Anexos */}
          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 transition-all hover:bg-zinc-800/90 text-zinc-100 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-zinc-800">
                <Paperclip className="h-5 w-5 text-zinc-300" />
              </div>
              <h3 className="font-semibold text-zinc-100">Anexos</h3>
            </div>
            <div className="-mx-5 -mb-5 px-5 pb-5 mt-2">
              <AttachmentsBlock
                patientId={patientId}
                evolutionId={evolutionId}
                value={data.attachments || []}
                onChange={(val) => handleFieldChange("attachments", val)}
                disabled={disabled}
                className="border-none shadow-none bg-zinc-950/50 rounded-2xl"
              />
            </div>
          </div>

        </div>
      </div>
    </Card>
  );
};

