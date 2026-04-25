import React from "react";
import {
  Activity,
  Stethoscope,
  ChevronRight,
  ExternalLink,
  PlayCircle,
  ClipboardCheck,
  Dumbbell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type KnowledgeArticle } from "@/data/knowledgeBase";
import { physioDictionary } from "@/data/physioDictionary";
import { exerciseDictionary } from "@/data/exerciseDictionary";

interface KnowledgeActionBridgeProps {
  article: KnowledgeArticle;
  onActionSelect?: (type: "test" | "exercise", id: string) => void;
}

export function KnowledgeActionBridge({ article, onActionSelect }: KnowledgeActionBridgeProps) {
  // Buscar detalhes dos testes sugeridos
  const suggestedTests = (article.recommended_tests_ids || [])
    .map((id) => physioDictionary.find((term) => term.id === id))
    .filter(Boolean);

  // Buscar detalhes dos exercícios sugeridos
  const suggestedExercises = (article.suggested_exercise_ids || [])
    .map((id) => exerciseDictionary.find((ex) => ex.id === id))
    .filter(Boolean);

  if (suggestedTests.length === 0 && suggestedExercises.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Activity className="h-4 w-4 text-primary animate-pulse" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Arsenal de Conduta Integrado
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Coluna de Testes Diagnósticos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1.5">
              <Stethoscope className="h-3 w-3" />
              Avaliação Diagnóstica
            </span>
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1.5 bg-sky-50 text-sky-700 border-sky-200"
            >
              {suggestedTests.length} Sugestões
            </Badge>
          </div>

          <div className="space-y-2">
            {suggestedTests.length > 0 ? (
              suggestedTests.map((test) => (
                <Card
                  key={test?.id}
                  className="border-slate-100 hover:border-sky-300 hover:shadow-sm transition-all group cursor-pointer overflow-hidden"
                  onClick={() => onActionSelect?.("test", test!.id)}
                >
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate group-hover:text-sky-700 transition-colors">
                        {test?.pt}
                      </p>
                      <p className="text-[10px] text-slate-500 italic truncate">{test?.en}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-full text-slate-400 group-hover:text-sky-600 group-hover:bg-sky-50"
                            >
                              <ClipboardCheck className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">Ver técnica detalhada</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-[10px] text-slate-400 italic py-2 px-1">
                Nenhuma ferramenta diagnóstica vinculada.
              </p>
            )}
          </div>
        </div>

        {/* Coluna de Exercícios / Tratamento */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1.5">
              <Dumbbell className="h-3 w-3" />
              Conduta Terapêutica
            </span>
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              {suggestedExercises.length} Exercícios
            </Badge>
          </div>

          <div className="space-y-2">
            {suggestedExercises.length > 0 ? (
              suggestedExercises.map((ex) => (
                <Card
                  key={ex?.id}
                  className="border-slate-100 hover:border-emerald-300 hover:shadow-sm transition-all group cursor-pointer overflow-hidden"
                  onClick={() => onActionSelect?.("exercise", ex!.id)}
                >
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {ex?.thumbnail_url ? (
                          <img
                            src={ex.thumbnail_url}
                            alt={ex.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <PlayCircle className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                          {ex?.name}
                        </p>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="ghost"
                            className="h-3 px-1 text-[8px] bg-slate-50 text-slate-500 p-0 font-normal"
                          >
                            {ex?.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-full text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">Prescrever exercício</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-[10px] text-slate-400 italic py-2 px-1">
                Nenhum exercício específico sugerido.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Banner de Feedback IA */}
      <div className="bg-slate-900/5 border border-slate-200/60 rounded-xl p-3 flex items-start gap-2.5">
        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Activity className="h-3 w-3 text-primary" />
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold text-slate-700 uppercase">
            Sugestão Baseada em Evidência
          </p>
          <p className="text-[10px] text-slate-600 leading-relaxed italic">
            As ações acima foram extraídas automaticamente das diretrizes clínicas deste artigo para
            otimizar seu tempo de consultório.
          </p>
        </div>
      </div>
    </div>
  );
}
