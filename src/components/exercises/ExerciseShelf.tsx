import React, { useState, useMemo } from "react";
import { useWorkersExercises } from "@/hooks/useExercises";
import { DraggableExerciseCard } from "./DraggableExerciseCard";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Star, Loader2, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAISuggestions } from "@/services/aiSuggestions";
import { Badge } from "@/components/ui/badge";

export function ExerciseShelf() {
  const [searchTerm, setSearchTerm] = useState("");
  const { exercises, loading } = useWorkersExercises({ q: searchTerm, limit: 20 });

  // Simulação de diagnóstico selecionado para demonstração
  const currentDiagnosis = "Dor Lombar";

  const aiSuggestions = useMemo(() => {
    if (loading || exercises.length === 0) return [];
    return getAISuggestions(currentDiagnosis, exercises);
  }, [exercises, loading]);

  return (
    <div className="flex flex-col h-full bg-card border rounded-lg overflow-hidden">
      <div className="p-4 border-b space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">Biblioteca</h3>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar exercícios..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1 text-primary">
              <Sparkles className="w-3 h-3" /> IA
            </TabsTrigger>
            <TabsTrigger value="favs" className="flex items-center gap-1">
              <Star className="w-3 h-3" /> Favs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 min-h-0 m-0">
          <ScrollArea className="h-[calc(100vh-350px)] px-4 py-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-2">
                {exercises.map((ex) => (
                  <DraggableExerciseCard key={ex.id} exercise={ex} />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="ai" className="flex-1 min-h-0 m-0">
          <ScrollArea className="h-[calc(100vh-350px)] px-4 py-4">
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Sugestões para:</p>
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                {currentDiagnosis}
              </Badge>
            </div>
            <div className="grid gap-2">
              {aiSuggestions.map((ex) => (
                <div key={ex.id} className="relative group">
                  <div className="absolute -top-1 -right-1 z-10">
                    <Badge className="h-5 px-1 bg-gradient-to-r from-purple-500 to-indigo-500 border-none text-[10px]">
                      {(ex as any).aiMetadata?.score}% Match
                    </Badge>
                  </div>
                  <DraggableExerciseCard exercise={ex} />
                </div>
              ))}
              {aiSuggestions.length === 0 && !loading && (
                <p className="text-center text-muted-foreground text-sm py-8">
                  Busque exercícios para ativar as sugestões.
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="favs" className="flex-1 min-h-0 m-0">
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhum favorito selecionado.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
