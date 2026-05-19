import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { request } from "@/api/v2/base";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WgerImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (enrichedData: any) => void;
}

interface WgerExercise {
  id: number;
  name: string;
  category: { name: string };
  equipment: { name: string }[];
}

export function WgerImportModal({ open, onOpenChange, onImport }: WgerImportModalProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [results, setResults] = useState<WgerExercise[]>([]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setResults([]);
    try {
      const data = await request<WgerExercise[]>(`/wger/search?q=${encodeURIComponent(query)}`);
      setResults(data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar os exercícios no wger.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleImport = async (id: number) => {
    setIsEnriching(true);
    try {
      const enrichedData = await request<any>(`/wger/enrich`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id })
      });
      onImport(enrichedData);
      onOpenChange(false);
      toast({
        title: "Sucesso!",
        description: "Exercício importado e enriquecido com Inteligência Artificial."
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro na importação",
        description: "Falha ao baixar e processar os dados completos.",
        variant: "destructive"
      });
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-emerald-600" />
            Importar do wger
          </DialogTitle>
          <DialogDescription>
            Busque exercícios no banco open-source wger. O sistema buscará evidências científicas (PubMed) e a IA estimará a dificuldade automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input 
            placeholder="Ex: Agachamento, Flexão..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" disabled={isSearching || !query.trim()}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>

        <ScrollArea className="h-72 mt-2 border rounded-md p-2 bg-slate-50 dark:bg-slate-900/50">
          {isEnriching ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
               <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
               <p className="text-sm font-medium animate-pulse">A IA está enriquecendo os dados clínicos...</p>
             </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              {results.map(ex => (
                <div key={ex.id} className="p-3 border rounded-lg bg-white flex justify-between items-center dark:bg-slate-800">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">{ex.name}</p>
                    <div className="flex gap-2 text-[10px] text-slate-500">
                      <span className="bg-slate-100 px-1 rounded">{ex.category?.name || "Geral"}</span>
                      {ex.equipment && ex.equipment.length > 0 && (
                        <span className="bg-slate-100 px-1 rounded">{ex.equipment[0].name}</span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => handleImport(ex.id)}>
                    Importar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Search className="h-8 w-8 opacity-20" />
              <p className="text-sm">Nenhum resultado</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
