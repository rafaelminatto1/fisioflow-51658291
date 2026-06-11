import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Users, ArrowRight, UserPlus, CheckCircle2, XCircle } from "lucide-react";
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

export function WaitlistManager() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: waitlist, isLoading } = useQuery({
    queryKey: ["scheduling", "waitlist"],
    queryFn: async () => {
      const res = await rpc.api.scheduling.waitlist.$get();
      if (!res.ok) throw new Error("Erro ao buscar fila de espera");
      return (await res.json()).data;
    },
    enabled: isOpen,
  });

  const offerSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await rpc.api.scheduling.waitlist[":id"].$put({
        param: { id },
        json: { status: "offered" }
      });
      if (!res.ok) throw new Error("Falha ao oferecer vaga");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scheduling", "waitlist"] })
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await rpc.api.scheduling.waitlist[":id"].$delete({
        param: { id }
      });
      if (!res.ok) throw new Error("Falha ao remover");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scheduling", "waitlist"] })
  });

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="h-9 px-4 gap-2 border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10 rounded-lg font-bold text-[11px] uppercase tracking-widest ml-1 shadow-sm transition-all"
        >
          <Clock className="w-3.5 h-3.5" />
          Fila de Espera
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md bg-background/95 backdrop-blur-xl border-l-border overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-xl font-black text-brand-blue">
            <Users className="h-5 w-5" /> Fila Dinâmica
          </SheetTitle>
          <SheetDescription>
            Gerencie pacientes aguardando horários na clínica.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : !waitlist || waitlist.length === 0 ? (
          <EmptyStateEnhanced
            icon={CheckCircle2}
            title="Fila Limpa"
            description="Não há nenhum paciente aguardando na fila de espera."
            className="py-12 bg-muted/20 border-none"
          />
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {waitlist.map((item: any, idx: number) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {item.patient_name || `Paciente ID: ${item.patient_id}`}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        Preferência: {item.preferred_days?.join(", ") || "Qualquer dia"}
                      </p>
                    </div>
                    <Badge
                      variant={item.priority === "high" ? "destructive" : "secondary"}
                      className="text-[10px] uppercase font-bold"
                    >
                      {item.priority || "Normal"}
                    </Badge>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <Button 
                      size="sm" 
                      variant="default" 
                      className="flex-1 bg-brand-blue hover:bg-brand-blue/90 h-8 text-[11px] font-bold rounded-xl shadow-sm"
                      onClick={() => offerSlotMutation.mutate(item.id)}
                      disabled={offerSlotMutation.isPending || item.status === "offered"}
                    >
                      <ArrowRight className="h-3 w-3 mr-1.5" />
                      {item.status === "offered" ? "Vaga Oferecida" : "Oferecer Vaga"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500 rounded-xl"
                      onClick={() => removeMutation.mutate(item.id)}
                      disabled={removeMutation.isPending}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="mt-8 border-t border-border/50 pt-6">
          <Button variant="outline" className="w-full gap-2 border-dashed border-2 hover:border-brand-blue/50 hover:bg-brand-blue/5 rounded-2xl h-12 text-sm font-bold text-muted-foreground hover:text-brand-blue transition-colors">
            <UserPlus className="h-4 w-4" />
            Adicionar à Fila
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
