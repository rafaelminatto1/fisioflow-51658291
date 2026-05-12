import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { TrendingUp, MessageSquare, Zap, Target, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LTVOpportunity {
  patient_id: string;
  full_name: string;
  package_title: string;
  remaining_sessions: number;
  total_sessions: number;
  adherence_score: string;
  ai_suggestion: string;
}

export function LTVMaximizerWidget() {
  const { data: opportunitiesResponse, isLoading } = useQuery({
    queryKey: ["ltv-opportunities"],
    queryFn: () => request<{ data: LTVOpportunity[] }>("/api/marketing/ltv-maximizer/opportunities"),
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  if (isLoading) {
    return <div className="h-48 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Identificando oportunidades de faturamento...</div>;
  }

  const opportunities = opportunitiesResponse?.data || [];
  if (opportunities.length === 0) return null;

  const handleSendWhatsApp = (phone: string, message: string) => {
    const url = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-4 w-4 text-emerald-500" />
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">LTV Maximizer (IA)</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {opportunities.slice(0, 4).map((opp) => (
          <Card key={opp.patient_id} className="border-none shadow-premium bg-white dark:bg-slate-900/50 hover:scale-[1.02] transition-transform">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">{opp.full_name}</CardTitle>
                  <CardDescription className="text-[10px] font-medium uppercase text-emerald-600 tracking-tighter">
                    {opp.package_title} • {opp.remaining_sessions} restantes
                  </CardDescription>
                </div>
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <Zap className="h-3 w-3" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                  "{opp.ai_suggestion}"
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 h-9 font-bold text-[11px] gap-2"
                  onClick={() => handleSendWhatsApp("", opp.ai_suggestion)}
                >
                  <MessageSquare className="h-3 w-3" />
                  Enviar WhatsApp
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="rounded-xl h-9 font-bold text-[11px]"
                >
                  Ver Perfil
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
