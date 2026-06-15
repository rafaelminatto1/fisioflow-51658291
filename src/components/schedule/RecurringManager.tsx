import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Repeat, CalendarRange, ArrowRight, PlayCircle, Settings, PlusCircle, Infinity as InfinityIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { rpc } from "@/lib/api/rpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EmptyStateEnhanced } from "@/components/ui/EmptyStateEnhanced";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function RecurringManager() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: recurringSchedules, isLoading } = useQuery({
    queryKey: ["scheduling", "recurring"],
    queryFn: async () => {
      // Mocked endpoint until fully wired with scheduling-recurring.ts
      const res = await rpc.api.scheduling.recurring.$get().catch(() => ({ ok: false }));
      if (!res.ok) {
        // Fallback mockup
        return [
          {
            id: "1",
            patient_id: "patient-123",
            frequency: "weekly",
            day_of_week: 1, // Segunda
            time: "09:00",
            start_date: "2026-06-01",
            end_date: "2026-12-31",
            status: "active"
          },
          {
            id: "2",
            patient_id: "patient-456",
            frequency: "weekly",
            day_of_week: 3, // Quarta
            time: "14:30",
            start_date: "2026-06-05",
            end_date: "2026-10-05",
            status: "paused"
          }
        ];
      }
      return (await (res as any).json()).data;
    },
    enabled: isOpen,
  });

  const getDayName = (day: number) => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return days[day] || "N/A";
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="h-9 px-4 gap-2 border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/10 rounded-lg font-bold text-[11px] uppercase tracking-widest ml-1 shadow-sm transition-all"
        >
          <Repeat className="w-3.5 h-3.5" />
          Pacotes
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md bg-background/95 backdrop-blur-xl border-l-border overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-xl font-black text-indigo-600">
            <CalendarRange className="h-5 w-5" /> Agendamentos Recorrentes
          </SheetTitle>
          <SheetDescription>
            Gerencie os pacotes e sessões de repetição automática.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : !recurringSchedules || recurringSchedules.length === 0 ? (
          <EmptyStateEnhanced
            icon={InfinityIcon}
            title="Nenhuma recorrência"
            description="Nenhum paciente possui pacote ou agendamento recorrente ativo."
            className="py-12 bg-muted/20 border-none"
          />
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {recurringSchedules.map((item: any, idx: number) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "p-4 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm transition-all group",
                    item.status === 'active' ? "border-indigo-200/50 hover:shadow-md" : "border-muted opacity-75"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        ID Paciente: {item.patient_id.substring(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1">
                        <Repeat className="h-3 w-3" />
                        Toda {getDayName(item.day_of_week)} às {item.time}
                      </p>
                    </div>
                    <Badge
                      variant={item.status === "active" ? "default" : "secondary"}
                      className={cn(
                        "text-[10px] uppercase font-bold",
                        item.status === "active" ? "bg-indigo-500 hover:bg-indigo-600" : ""
                      )}
                    >
                      {item.status === "active" ? "Ativo" : "Pausado"}
                    </Badge>
                  </div>
                  
                  <div className="text-[11px] text-muted-foreground mb-4 bg-muted/30 p-2 rounded-lg flex items-center justify-between">
                    <span>
                      Início: {format(new Date(item.start_date), "dd/MM/yyyy")}
                    </span>
                    <ArrowRight className="h-3 w-3 mx-2 opacity-50" />
                    <span>
                      Fim: {format(new Date(item.end_date), "dd/MM/yyyy")}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px] font-bold rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                      <Settings className="h-3 w-3 mr-1.5" />
                      Gerenciar
                    </Button>
                    {item.status !== "active" && (
                      <Button size="sm" variant="ghost" className="h-8 text-[11px] font-bold rounded-xl text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700">
                        <PlayCircle className="h-3 w-3 mr-1.5" />
                        Retomar
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="mt-8 border-t border-border/50 pt-6">
          <Button variant="outline" className="w-full gap-2 border-dashed border-2 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-2xl h-12 text-sm font-bold text-muted-foreground hover:text-indigo-600 transition-colors">
            <PlusCircle className="h-4 w-4" />
            Criar Novo Pacote
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
