import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UserX, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ChurnPatient {
  id: string;
  full_name: string;
  last_session_date: string;
  days_inactive: number;
}

export function ChurnReport() {
  const navigate = useNavigate();
  const { data: churnResponse, isLoading } = useQuery({
    queryKey: ["churn-report"],
    queryFn: () => request<{ data: ChurnPatient[] }>("/api/clinic-metrics/churn"),
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  if (isLoading) {
    return <div className="h-96 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Identificando possíveis abandonos...</div>;
  }

  const data = churnResponse?.data || [];

  return (
    <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center gap-2 text-red-500 mb-1">
          <UserX className="h-4 w-4" />
          <CardTitle className="text-lg font-black tracking-tight">Relatório de Churn (Perda)</CardTitle>
        </div>
        <CardDescription>Pacientes ativos sem comparecimento há mais de 30 dias</CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <th className="px-6 py-4">Paciente</th>
              <th className="px-6 py-4">Última Sessão</th>
              <th className="px-6 py-4">Dias Inativo</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">Nenhum paciente em churn identificado. Bom trabalho!</td>
              </tr>
            ) : (
              data.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 font-bold text-sm text-slate-700 dark:text-slate-200">{p.full_name}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {p.last_session_date ? format(new Date(p.last_session_date), "dd/MM/yyyy", { locale: ptBR }) : "N/A"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                      {p.days_inactive} dias
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 rounded-lg text-[10px] font-black uppercase gap-2 hover:bg-emerald-50 hover:text-emerald-600"
                      onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Oi ${p.full_name.split(' ')[0]}! Tudo bem? Sentimos sua falta na Mooca Fisio. Como está sua recuperação?`)}`, "_blank")}
                    >
                      <MessageSquare className="h-3 w-3" />
                      Reativar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 rounded-lg text-[10px] font-black uppercase gap-2"
                      onClick={() => navigate(`/pacientes/${p.id}`)}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Perfil
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
