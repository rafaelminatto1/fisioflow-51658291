import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { AlertTriangle, Save, Loader2, CheckCircle2, Info, Shield, Clock } from 'lucide-react';
import { useScheduleSettings, CancellationRule } from '@/hooks/useScheduleSettings';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

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
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (cancellationRules) {
      setRules(cancellationRules);
    }
  }, [cancellationRules]);

  const updateRule = (field: keyof CancellationRule, value: number | boolean) => {
    setRules({ ...rules, [field]: value });
    setSaved(false);
  };

  const handleSave = () => {
    upsertCancellationRules(rules);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (isLoadingRules) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando regras...</p>
        </CardContent>
      </Card>
    );
  }

  const hoursBefore = rules.min_hours_before || 24;
  const maxCancellations = rules.max_cancellations_month || 3;
  const lateFee = rules.late_cancellation_fee || 0;

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-t-xl">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 bg-amber-500 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          Regras de Cancelamento
        </CardTitle>
        <CardDescription>
          Configure as políticas de cancelamento de agendamentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Info Banner */}
        <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">Dica</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            Regras de cancelamento ajudam a reduzir faltas e permitem melhor planejamento da agenda.
          </AlertDescription>
        </Alert>

        {/* Antecedência Mínima */}
        <div className="space-y-4 p-4 rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Antecedência Mínima
            </Label>
            <Badge variant="outline" className="text-lg font-bold px-3 py-1">
              {hoursBefore}h
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Pacientes devem cancelar com pelo menos {hoursBefore}h de antecedência
          </p>
          <Slider
            value={[hoursBefore]}
            onValueChange={([value]) => updateRule('min_hours_before', value)}
            min={1}
            max={72}
            step={1}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>1h</span>
            <span>12h</span>
            <span>24h</span>
            <span>48h</span>
            <span>72h</span>
          </div>
        </div>

        {/* Limite de Cancelamentos */}
        <div className="space-y-4 p-4 rounded-xl border bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Limite Mensal
            </Label>
            <Badge variant="outline" className="text-lg font-bold px-3 py-1">
              {maxCancellations === 0 ? 'Ilimitado' : `${maxCancellations}/mês`}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {maxCancellations === 0
              ? 'Sem limite de cancelamentos por mês'
              : `Máximo de ${maxCancellations} cancelamento(s) por mês por paciente`
            }
          </p>
          <Slider
            value={[maxCancellations]}
            onValueChange={([value]) => updateRule('max_cancellations_month', value)}
            min={0}
            max={10}
            step={1}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>Ilimitado</span>
            <span>3</span>
            <span>5</span>
            <span>8</span>
            <span>10</span>
          </div>
        </div>

        {/* Permissões */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold text-sm">Permissões</h3>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="flex-1">
              <Label className="text-base font-medium">Permitir Auto-cancelamento</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Pacientes podem cancelar agendamentos via WhatsApp/portal
              </p>
            </div>
            <Switch
              checked={rules.allow_patient_cancellation ?? true}
              onCheckedChange={(checked) => updateRule('allow_patient_cancellation', checked)}
              className="data-[state=checked]:bg-green-600"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="flex-1">
              <Label className="text-base font-medium">Cobrar Cancelamento Tardio</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Aplicar taxa quando cancelamento for fora do prazo
              </p>
            </div>
            <Switch
              checked={rules.charge_late_cancellation ?? false}
              onCheckedChange={(checked) => updateRule('charge_late_cancellation', checked)}
              className={cn(
                "transition-colors",
                rules.charge_late_cancellation ? "bg-red-600 data-[state=checked]:bg-red-600" : ""
              )}
            />
          </div>

          {rules.charge_late_cancellation && (
            <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/20 ml-4 animate-in slide-in-from-top-2 duration-300">
              <Label className="text-sm font-medium mb-3 block">Taxa de Cancelamento Tardio</Label>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">R$</span>
                <Slider
                  value={[lateFee]}
                  onValueChange={([value]) => updateRule('late_cancellation_fee', value)}
                  min={0}
                  max={200}
                  step={5}
                  className="flex-1 cursor-pointer"
                />
                <span className="text-2xl font-bold min-w-[80px] text-right">
                  {lateFee.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground px-1 mt-2">
                <span>Grátis</span>
                <span>R$ 50</span>
                <span>R$ 100</span>
                <span>R$ 150</span>
                <span>R$ 200</span>
              </div>
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="sticky bottom-0 pt-4 bg-background/95 backdrop-blur border-t">
          <Button
            onClick={handleSave}
            disabled={isSavingRules || saved}
            className={cn(
              "w-full h-12 text-base font-semibold transition-all",
              saved && "bg-green-600 hover:bg-green-700"
            )}
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Salvo com sucesso!
              </>
            ) : isSavingRules ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Salvar Regras
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
