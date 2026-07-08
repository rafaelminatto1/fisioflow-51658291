import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HeartPulse, CheckCircle2, Send, UserCheck } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AtRiskPatient {
  id: string;
  name: string;
  discharge_date: string;
  days_since_discharge: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PostDischargeAlert() {
  const [contacted, setContacted] = useState<Set<string>>(new Set());

  // Fetch patients in the reactivation window (25–35 days post-discharge)
  const { data: patients = [], isLoading } = useQuery<AtRiskPatient[]>({
    queryKey: ["post-discharge-at-risk"],
    queryFn: async () => {
      const res = await request<AtRiskPatient[]>("GET", "/api/post-discharge/at-risk");
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Mutation to trigger a follow-up message
  const { mutate: triggerFollowup, isPending } = useMutation({
    mutationFn: (patientId: string) =>
      request("POST", "/api/post-discharge/trigger-followup", { patientId }),
    onSuccess: (_data, patientId) => {
      setContacted((prev) => new Set(prev).add(patientId));
      toast.success("Check-in enviado com sucesso!", {
        description: "O paciente receberá uma mensagem de reativação.",
      });
    },
    onError: () => {
      toast.error("Erro ao enviar check-in. Tente novamente.");
    },
  });

  // -------------------------------------------------------------------------
  // Loading skeleton
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <Card className="premium-glass border border-border/50 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  if (patients.length === 0) {
    return (
      <Card className="premium-glass border border-border/50 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
              <HeartPulse className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-black">Reativação Pós-Alta</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-8 text-center"
          >
            <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              Nenhum paciente no período de reativação.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Pacientes com 25–35 dias pós-alta aparecerão aqui.
            </p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------
  return (
    <Card className="premium-glass border border-primary/15 shadow-lg overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-black">Reativação Pós-Alta</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pacientes no período crítico de retorno (25–35 dias)
              </p>
            </div>
          </div>
          <Badge className="bg-rose-500 text-white text-xs font-black border-0 rounded-full">
            {patients.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <AnimatePresence>
          {patients.map((patient, index) => {
            const isContacted = contacted.has(patient.id);
            return (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ delay: index * 0.06 }}
                className={[
                  "flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-b-0 transition-colors",
                  isContacted
                    ? "bg-emerald-50/60 dark:bg-emerald-900/10"
                    : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30",
                ].join(" ")}
              >
                {/* Avatar / status icon */}
                <div
                  className={[
                    "h-9 w-9 rounded-full flex items-center justify-center shrink-0 font-black text-sm",
                    isContacted
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40"
                      : "bg-rose-100 text-rose-600 dark:bg-rose-900/40",
                  ].join(" ")}
                >
                  {isContacted ? (
                    <UserCheck className="h-4 w-4" />
                  ) : (
                    patient.name.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Patient info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{patient.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {patient.days_since_discharge} dias desde a alta
                  </p>
                </div>

                {/* Action button */}
                {isContacted ? (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold border-0 shrink-0"
                  >
                    Contato enviado
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs font-bold gap-1.5 shrink-0 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 dark:hover:bg-rose-900/20 dark:hover:text-rose-400 transition-colors"
                    disabled={isPending}
                    onClick={() => triggerFollowup(patient.id)}
                  >
                    <Send className="h-3 w-3" />
                    Enviar Check-in
                  </Button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
