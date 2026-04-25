import React from "react";
import {
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Stethoscope,
  Clock,
  Target,
  BookOpen,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProtocolEntry } from "@/data/protocolDictionary";
import { exerciseDictionary } from "@/data/exerciseDictionary";
import { physioDictionary } from "@/data/physioDictionary";
import { cn } from "@/lib/utils";

interface ProtocolDetailViewProps {
  protocol: ProtocolEntry;
  onSelectExercise?: (id: string) => void;
}

export function ProtocolDetailView({ protocol, onSelectExercise }: ProtocolDetailViewProps) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto p-1">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-sky-500/10 text-sky-600 border-sky-200 hover:bg-sky-500/20">
            Protocolo Clínico
          </Badge>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {protocol.id}
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {protocol.pt}
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed italic">"{protocol.description_pt}"</p>
      </div>

      <div className="grid grid-cols-1 gap-8 relative">
        {/* Timeline Line */}
        <div className="absolute left-[17px] top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-800 hidden md:block" />

        {protocol.phases.map((phase, idx) => (
          <div key={idx} className="relative md:pl-12 space-y-4">
            {/* Timeline Marker */}
            <div className="absolute left-0 top-1 h-9 w-9 rounded-full bg-white dark:bg-slate-900 border-2 border-primary flex items-center justify-center z-10 hidden md:flex shadow-sm">
              <span className="text-xs font-bold text-primary">{idx + 1}</span>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b pb-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {phase.name}
                </h3>
                {phase.duration && (
                  <Badge
                    variant="secondary"
                    className="w-fit flex items-center gap-1.5 bg-slate-100 text-slate-600"
                  >
                    <Clock className="h-3 w-3" />
                    {phase.duration}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Objetivos e Critérios */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400">
                      <Target className="h-3 w-3" /> Objetivos da Fase
                    </div>
                    <ul className="space-y-1.5">
                      {phase.objectives.map((obj, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2 p-3 bg-amber-50/30 rounded-lg border border-amber-100">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-amber-600">
                      <BookOpen className="h-3 w-3" /> Critérios de Progressão
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {phase.criteria.map((crit, i) => {
                        const test = physioDictionary.find((t) => t.id === crit);
                        return (
                          <Badge
                            key={i}
                            variant="outline"
                            className="bg-white border-amber-200 text-amber-700 text-[10px]"
                          >
                            {test ? test.pt : crit}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Exercícios Sugeridos */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400">
                    <Dumbbell className="h-3 w-3" /> Exercícios do Arsenal
                  </div>
                  <div className="space-y-2">
                    {phase.exercises.map((exId, i) => {
                      const exercise = exerciseDictionary.find((e) => e.id === exId);
                      if (!exercise) return null;
                      return (
                        <Card
                          key={i}
                          className="border-slate-100 hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer group"
                          onClick={() => onSelectExercise?.(exercise.id)}
                        >
                          <CardContent className="p-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                                <Dumbbell className="h-4 w-4 text-slate-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate group-hover:text-primary transition-colors">
                                  {exercise.pt}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {exercise.subcategory}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
