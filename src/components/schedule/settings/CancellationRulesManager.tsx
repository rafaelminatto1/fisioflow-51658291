import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Switch } from '@/components/shared/ui/switch';
import { AlertTriangle, Save, Loader2 } from 'lucide-react';
import { useScheduleSettings, CancellationRule } from '@/hooks/useScheduleSettings';

const DEFAULT_RULES: Partial<CancellationRule> = {
  min_hours_before: 24,
  allow_patient_cancellation: true,
  max_cancellations_month: 3,
  charge_late_cancellation: false,
  late_cancellation_fee: 0,
};

export function CancellationRulesManager() {
  const { cancellationRules, upsertCancellationRules, isLoadingRules, isSavingRules } = useScheduleSettings();
  const [rules, setRules] = useState<Partial<CancellationRule>>(DEFAULT_RULES);

  useEffect(() => {
    if (cancellationRules) {
      setRules(cancellationRules);
    }
  }, [cancellationRules]);

  const handleSave = () => {
    upsertCancellationRules(rules);
  };

  if (isLoadingRules) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Regras de Cancelamento
        </CardTitle>
        <CardDescription>
          Configure as políticas de cancelamento de agendamentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="min_hours">Antecedência Mínima (horas)</Label>
            <Input
              id="min_hours"
              type="number"
              min={1}
              max={168}
              value={rules.min_hours_before || 24}
              onChange={(e) => setRules({ ...rules, min_hours_before: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Pacientes devem cancelar com pelo menos {rules.min_hours_before || 24}h de antecedência
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_cancel">Máximo de Cancelamentos/Mês</Label>
            <Input
              id="max_cancel"
              type="number"
              min={0}
              max={10}
              value={rules.max_cancellations_month || 3}
              onChange={(e) => setRules({ ...rules, max_cancellations_month: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              0 = sem limite de cancelamentos
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label>Permitir Cancelamento pelo Paciente</Label>
              <p className="text-xs text-muted-foreground">
                Pacientes podem cancelar via WhatsApp/portal
              </p>
            </div>
            <Switch
              checked={rules.allow_patient_cancellation ?? true}
              onCheckedChange={(checked) => setRules({ ...rules, allow_patient_cancellation: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Cobrar Cancelamento Tardio</Label>
              <p className="text-xs text-muted-foreground">
                Cobrar taxa para cancelamentos fora do prazo
              </p>
            </div>
            <Switch
              checked={rules.charge_late_cancellation ?? false}
              onCheckedChange={(checked) => setRules({ ...rules, charge_late_cancellation: checked })}
            />
          </div>

          {rules.charge_late_cancellation && (
            <div className="space-y-2 ml-4 p-3 bg-muted/50 rounded-lg">
              <Label htmlFor="fee">Taxa de Cancelamento Tardio (R$)</Label>
              <Input
                id="fee"
                type="number"
                min={0}
                step={0.01}
                value={rules.late_cancellation_fee || 0}
                onChange={(e) => setRules({ ...rules, late_cancellation_fee: parseFloat(e.target.value) })}
                className="w-32"
              />
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={isSavingRules} className="w-full">
          {isSavingRules ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Regras
        </Button>
      </CardContent>
    </Card>
  );
}