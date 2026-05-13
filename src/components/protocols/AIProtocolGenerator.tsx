import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Wand2, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { iaStudioApi } from "@/api/v2/iaStudio";
import { useExerciseProtocols } from "@/hooks/useExerciseProtocols";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface AIProtocolGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AIProtocolGenerator: React.FC<AIProtocolGeneratorProps> = ({
  open,
  onOpenChange,
}) => {
  const [condition, setCondition] = useState("");
  const [sessionCount, setSessionCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProtocol, setGeneratedProtocol] = useState<any>(null);
  const { createProtocol } = useExerciseProtocols();

  const handleGenerate = async () => {
    if (!condition.trim()) {
      toast.error("Por favor, informe a condição clínica.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await iaStudioApi.generateProtocol(condition, sessionCount);
      if (res.success) {
        setGeneratedProtocol(res.data);
        toast.success("Protocolo gerado pela IA com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao gerar protocolo:", error);
      toast.error("Falha ao gerar protocolo. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedProtocol) return;

    try {
      // Converte o formato da IA para o formato do banco
      await createProtocol({
        name: generatedProtocol.title,
        description: generatedProtocol.objective,
        category: "rehabilitation",
        muscles: [], // TODO: IA poderia extrair isso
        exercises: generatedProtocol.phases.flatMap((p: any) => 
          p.exercises.map((e: string) => ({ 
            name: e, 
            instructions: p.description,
            phase: p.name
          }))
        ),
        is_public: false,
      });

      toast.success("Protocolo salvo na sua biblioteca!");
      onOpenChange(false);
      setGeneratedProtocol(null);
      setCondition("");
    } catch (error) {
      toast.error("Erro ao salvar protocolo.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
        <DialogHeader className="p-8 bg-gradient-to-br from-brand-blue to-indigo-600 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-white/20">
              <Brain className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl font-black">AI Protocol Studio</DialogTitle>
          </div>
          <DialogDescription className="text-blue-100 font-medium">
            Gere um plano de tratamento de elite baseado em evidências para qualquer diagnóstico em segundos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-6 bg-slate-50 dark:bg-slate-900/50">
          {!generatedProtocol ? (
            <div className="space-y-6 py-10">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-black uppercase tracking-widest text-slate-400">Qual a condição clínica?</Label>
                  <Input 
                    placeholder="Ex: Pós-op de LCA (4 semanas), Hérnia de Disco L4-L5 Aguda..." 
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="h-14 rounded-2xl text-lg border-none shadow-sm focus-visible:ring-brand-blue"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-black uppercase tracking-widest text-slate-400">Quantidade de Sessões Alvo</Label>
                  <div className="flex gap-2">
                    {[6, 10, 20].map((num) => (
                      <Button
                        key={num}
                        type="button"
                        variant={sessionCount === num ? "default" : "outline"}
                        onClick={() => setSessionCount(num)}
                        className="flex-1 rounded-xl h-12 font-bold"
                      >
                        {num} Sessões
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !condition.trim()}
                className="w-full h-16 rounded-[1.5rem] bg-brand-blue hover:bg-blue-700 text-lg font-black shadow-lg shadow-blue-200 dark:shadow-none transition-all group"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    Consultando evidências clínicas...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-6 w-6 group-hover:rotate-12 transition-transform" />
                    Gerar Protocolo Inteligente
                  </>
                )}
              </Button>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex gap-3">
                 <div className="p-2 rounded-lg bg-amber-50 text-amber-600 h-fit">
                    <Sparkles className="h-4 w-4" />
                 </div>
                 <p className="text-xs text-slate-500 leading-relaxed">
                   A IA analisará a condição informada e criará fases de tratamento baseadas em protocolos de reabilitação modernos (warm-up, fortalecimento, propriocepção e critérios de alta).
                 </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="pr-4">
              <div className="space-y-6 pb-4">
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{generatedProtocol.title}</h3>
                  <p className="text-sm text-slate-500 italic">"{generatedProtocol.objective}"</p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fases do Tratamento</h4>
                  {generatedProtocol.phases.map((phase: any, idx: number) => (
                    <div key={idx} className="relative pl-8 pb-4 border-l-2 border-brand-blue/20 last:border-l-0">
                      <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-brand-blue flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-black text-brand-blue uppercase text-xs tracking-wider">{phase.name}</h5>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md">{phase.sessions}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{phase.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {phase.exercises.map((ex: string, eIdx: number) => (
                            <span key={eIdx} className="px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500">
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          {generatedProtocol ? (
            <div className="flex w-full gap-3">
              <Button variant="outline" onClick={() => setGeneratedProtocol(null)} className="flex-1 rounded-xl h-12 font-bold">
                Tentar Outro
              </Button>
              <Button onClick={handleSave} className="flex-1 rounded-xl h-12 bg-emerald-600 hover:bg-emerald-700 font-bold gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Salvar Protocolo
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full rounded-xl font-bold">
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
