import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/v2/client";
import { getWorkersApiUrl } from "@/lib/api/config";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, BookOpen } from "lucide-react";

/**
 * Toggle admin: acesso do paciente ao assistente de orientações.
 * DESLIGADO por padrão — o backend só libera quando esta flag está ligada.
 * Visível apenas para administradores.
 */
export function PatientKnowledgeToggle() {
  const { isAdmin } = usePermissions();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const base = `${getWorkersApiUrl()}/api/ai-config/features`;

  useEffect(() => {
    let active = true;
    apiClient
      .get<{ patientKnowledgeEnabled: boolean }>(base)
      .then((r) => active && setEnabled(!!r.patientKnowledgeEnabled))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [base]);

  if (!isAdmin) return null;

  async function onToggle(next: boolean) {
    const prev = enabled;
    setEnabled(next);
    setSaving(true);
    try {
      await apiClient.put<{ patientKnowledgeEnabled: boolean }>(`${base}/patient-knowledge`, {
        enabled: next,
      });
      toast({
        title: next ? "Acesso do paciente ativado" : "Acesso do paciente desativado",
      });
    } catch (e: any) {
      setEnabled(prev);
      toast({
        title: "Não foi possível salvar",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4" /> Assistente de orientações do paciente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="patient-kb">
              Permitir que pacientes consultem a base de orientações
            </Label>
            <p className="text-sm text-muted-foreground">
              Desligado por padrão. Quando ativo, pacientes recebem respostas apenas de conteúdo
              liberado para paciente — nunca a base clínica interna — com guardrails de segurança.
            </p>
          </div>
          <Switch
            id="patient-kb"
            checked={enabled}
            disabled={loading || saving}
            onCheckedChange={onToggle}
          />
        </div>
        <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Ative apenas quando as orientações estiverem revisadas. O assistente não dá diagnóstico
            nem prescreve — orienta e encaminha ao fisioterapeuta.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
