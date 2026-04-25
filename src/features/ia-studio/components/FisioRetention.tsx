import React from "react";
import { useQuery } from "@tanstack/react-query";
import { iaStudioApi, AtRiskPatient } from "@/api/v2";
import {
  MessageSquare,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Send,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FisioRetentionProps {
  compact?: boolean;
}

export const FisioRetention: React.FC<FisioRetentionProps> = ({ compact }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["ia-studio", "retention"],
    queryFn: () => iaStudioApi.getAtRiskPatients(),
  });

  const handleSendWhatsApp = (patient: AtRiskPatient) => {
    const message = `Olá ${patient.fullName.split(" ")[0]}, sentimos sua falta na clínica FisioFlow! Tudo bem com sua recuperação? Gostaríamos de agendar sua próxima sessão.`;
    const url = `https://wa.me/${patient.phone?.replace(/\D/g, "") || ""}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    toast.success(`Iniciando contato com ${patient.fullName}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className={cn("w-full rounded-2xl", compact ? "h-16" : "h-24")} />
        ))}
      </div>
    );
  }

  const patients = data?.data || [];

  if (compact) {
    return (
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {patients.slice(0, 5).map((p, idx) => (
          <div
            key={p.id}
            className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-500 flex-shrink-0">
                {p.fullName.charAt(0)}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold truncate">{p.fullName}</h4>
                <p className="text-[10px] text-slate-500 truncate">{p.reason}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500/10 text-amber-500 border-none text-[8px] h-4 px-1">
                {p.riskScore}%
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleSendWhatsApp(p)}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              </Button>
            </div>
          </div>
        ))}
        {patients.length === 0 && (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-20" />
            <p className="text-[10px] text-slate-500 font-medium">Sem riscos pendentes.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Pacientes com Risco de Churn
        </h3>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
          {patients.length} Alertas
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {patients.map((p, idx) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="border-none shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-900 rounded-2xl overflow-hidden group">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                      {p.fullName.charAt(0)}
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-white font-bold">
                      !
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {p.fullName}
                      <Badge className="bg-red-500/10 text-red-500 border-none text-[9px] h-4">
                        Risco {p.riskScore}%
                      </Badge>
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Última sessão: {new Date(p.lastSession).toLocaleDateString()} • {p.reason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl h-9 gap-1.5 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10"
                    onClick={() => handleSendWhatsApp(p)}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Reengajar
                  </Button>
                  <Button size="icon" variant="ghost" className="rounded-full h-9 w-9">
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {patients.length === 0 && (
          <div className="text-center py-12 bg-emerald-500/5 rounded-[32px] border border-dashed border-emerald-500/20">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
            <p className="text-emerald-700 font-medium">Parabéns! Sua retenção está em 100%.</p>
            <p className="text-xs text-emerald-600/70">
              Nenhum paciente em risco detectado pela IA hoje.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
