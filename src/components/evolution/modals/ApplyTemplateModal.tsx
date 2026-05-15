import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEvolutionTemplates } from "@/hooks/useEvolutionTemplates";
import { FileText, Wand2, Loader2, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface ApplyTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (content: string) => void;
}

export const ApplyTemplateModal: React.FC<ApplyTemplateModalProps> = ({
  open,
  onOpenChange,
  onApply,
}) => {
  const { data: templates = [], isLoading } = useEvolutionTemplates();

  const handleApply = (content: string, name: string) => {
    onApply(content);
    toast.success(`Template "${name}" aplicado com sucesso!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[2rem] border-none shadow-2xl dark:shadow-none bg-white dark:bg-slate-900 p-0 overflow-hidden">
        <DialogHeader className="p-8 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-brand-blue/10">
              <FileText className="h-5 w-5 text-brand-blue" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">
              Modelos de Evolução
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 font-medium">
            Selecione um modelo clínico para acelerar seu registro. Você poderá editar o texto
            livremente após aplicar.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 text-brand-blue animate-spin" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Buscando templates clínicos...
              </p>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                <Info className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-bold">
                Nenhum template encontrado para sua organização.
              </p>
              <Button variant="outline" className="rounded-full">
                Cadastrar Primeiro Template
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid gap-4 pb-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleApply(template.conteudo, template.nome)}
                    className="flex flex-col text-left p-6 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-brand-blue/30 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group"
                  >
                    <div className="flex justify-between items-start w-full mb-2">
                      <h4 className="font-black text-slate-900 dark:text-white group-hover:text-brand-blue transition-colors">
                        {template.nome}
                      </h4>
                      <Wand2 className="h-4 w-4 text-slate-300 group-hover:text-brand-blue transition-colors" />
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {template.descricao || "Sem descrição disponível."}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        SOAP Estruturado
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-[10px] font-black uppercase tracking-wider text-emerald-600">
                        AI Compatible
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-full font-bold"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
