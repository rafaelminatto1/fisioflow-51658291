import { MessageCircle, UserX, ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { request } from "@/api/v2";
import { RetentionAutomationService } from "@/services/marketing/retentionAutomation";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AtRiskPatient {
  id: string;
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
  last_appointment_date: string;
  days_since_last_session: number;
  dropout_risk?: number;
  suggested_action?: string;
}

function useAtRiskPatients() {
  return useQuery<AtRiskPatient[]>({
    queryKey: ["at-risk-patients"],
    queryFn: async () => {
      const res = await request<{ data: AtRiskPatient[] }>("/api/clinic-metrics/at-risk-patients");
      return (res as { data: AtRiskPatient[] }).data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

function buildWhatsAppUrl(patient: AtRiskPatient): string | null {
  const raw = patient.whatsapp || patient.phone;
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  const text = encodeURIComponent(
    `Olá ${patient.full_name.split(" ")[0]}! Sentimos sua falta. Que tal agendar sua próxima sessão? Estamos à disposição 😊`,
  );
  return `https://wa.me/${number}?text=${text}`;
}

export function AtRiskPatientsAlert() {
  const { data: patients, isLoading } = useAtRiskPatients();
  const [expanded, setExpanded] = useState(false);
  const [isAutomating, setIsAutomating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAutomate = async () => {
    setIsAutomating(true);
    const result = await RetentionAutomationService.automateAtRiskReengagement();
    setIsAutomating(false);
    
    if (result.success) {
      toast({
        title: "Automação disparada!",
        description: result.message,
      });
      queryClient.invalidateQueries({ queryKey: ["at-risk-patients"] });
    } else {
      toast({
        title: "Falha na automação",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-border/50 shadow-sm bg-card/80">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-56" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!patients || patients.length === 0) return null;

  const visible = expanded ? patients : patients.slice(0, 3);

  return (
    <Card className="border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Risco de Abandono
              <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 border-0">
                {patients.length}
              </Badge>
            </CardTitle>
          </div>
          
          <Button 
            size="sm" 
            onClick={handleAutomate}
            disabled={isAutomating}
            className="h-8 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] uppercase tracking-wider gap-2 shadow-sm"
          >
            {isAutomating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Automação Smart
          </Button>
        </div>
        <p className="text-[10px] text-amber-600/70 font-bold mt-1 uppercase">
          Pacientes sem sessão há ≥ 14 dias
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.map((p) => {
          const waUrl = buildWhatsAppUrl(p);
          return (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-zinc-900 border border-amber-100 dark:border-amber-900 px-4 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-bold truncate">{p.full_name}</p>
                  {p.dropout_risk !== undefined && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[9px] px-1.5 py-0 border-0",
                        p.dropout_risk > 70 ? "bg-red-100 text-red-700" : 
                        p.dropout_risk > 40 ? "bg-amber-100 text-amber-700" : 
                        "bg-emerald-100 text-emerald-700"
                      )}
                    >
                      {p.dropout_risk}% Risco
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Última sessão:{" "}
                  {new Date(p.last_appointment_date + "T12:00:00").toLocaleDateString("pt-BR")}{" "}
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    ({p.days_since_last_session} dias)
                  </span>
                </p>
                {p.suggested_action && (
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium italic mt-1 leading-tight line-clamp-1">
                    Sugestão IA: {p.suggested_action}
                  </p>
                )}
              </div>
              {waUrl ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-8 gap-1.5 text-[11px] border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
                  asChild
                >
                  <a href={waUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                </Button>
              ) : (
                <span className="text-[11px] text-muted-foreground shrink-0">Sem telefone</span>
              )}
            </div>
          );
        })}

        {patients.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[11px] text-muted-foreground gap-1 h-7"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Ver mais {patients.length - 3} pacientes
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

