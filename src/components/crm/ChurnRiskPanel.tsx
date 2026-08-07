import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, MessageSquare, Phone, Clock } from "lucide-react";
import { usePatientsAtRisk, PatientAtRisk } from "@/hooks/usePatientRetention";
import { toast } from "sonner";

export function ChurnRiskPanel() {
  const { data: atRiskPatients = [], isLoading } = usePatientsAtRisk(30);

  const handleReactivateWhatsApp = (patient: PatientAtRisk) => {
    if (!patient.phone) {
      toast.error("Paciente sem telefone cadastrado.");
      return;
    }
    const cleanPhone = patient.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const message = encodeURIComponent(
      `Olá ${patient.name}, tudo bem? Sentimos sua falta na FisioFlow! Gostaríamos de saber como está sua evolução e agendar sua próxima sessão.`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, "_blank");
    toast.success(`Mensagem de reativação gerada para ${patient.name}`);
  };

  return (
    <Card className="border border-rose-500/20 shadow-xs bg-rose-500/5 dark:bg-rose-950/10">
      <CardHeader className="pb-3 border-b border-rose-500/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            IA Radar Antichurn — Pacientes em Risco de Evasão
          </CardTitle>
          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-xs">
            {atRiskPatients.length} pacientes em alerta
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-6 text-slate-500 text-xs animate-pulse">
            Analisando retenção e cálculo de risco por IA...
          </div>
        ) : atRiskPatients.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            🎉 Nenhum paciente em alto risco de abandono detectado no momento!
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-auto pr-1">
            {atRiskPatients.slice(0, 10).map((patient) => (
              <div
                key={patient.id}
                className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{patient.name}</span>
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      Risco {patient.riskScore}%
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-slate-500 text-[11px] flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      Sem sessão há {patient.daysSinceLastSession} dias
                    </span>
                    {patient.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-blue-500" />
                        {patient.phone}
                      </span>
                    )}
                  </div>

                  {patient.riskFactors && patient.riskFactors.length > 0 && (
                    <div className="flex gap-1 flex-wrap pt-1">
                      {patient.riskFactors.map((factor, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded border"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReactivateWhatsApp(patient)}
                  className="h-8 text-xs gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  Reativar no WhatsApp
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
