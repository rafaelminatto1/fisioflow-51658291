import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  FileWarning,
  ClipboardList,
} from 'lucide-react';
import type { MandatoryTestAlert as MandatoryTestAlertType } from '@/types/evolution';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MandatoryTestAlertProps {
  alerts: MandatoryTestAlertType[];
  onRegisterException?: (testName: string, reason: string) => void;
  onTestClick?: (testName: string) => void;
  compact?: boolean;
}

export const MandatoryTestAlert: React.FC<MandatoryTestAlertProps> = ({
  alerts,
  onRegisterException,
  onTestClick,
  compact = false,
}) => {
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [exceptionReason, setExceptionReason] = useState('');

  const criticalAlerts = alerts.filter(a => a.alert_level === 'critico' && !a.is_completed);
  const importantAlerts = alerts.filter(a => a.alert_level === 'importante' && !a.is_completed);
  const lightAlerts = alerts.filter(a => a.alert_level === 'leve' && !a.is_completed);
  const completedTests = alerts.filter(a => a.is_completed);

  const hasAlerts = criticalAlerts.length > 0 || importantAlerts.length > 0 || lightAlerts.length > 0;

  const handleOpenException = (testName: string) => {
    setSelectedTest(testName);
    setExceptionReason('');
    setExceptionDialogOpen(true);
  };

  const handleSubmitException = () => {
    if (!selectedTest || !exceptionReason.trim()) {
      toast.error('Informe o motivo da exceção');
      return;
    }

    onRegisterException?.(selectedTest, exceptionReason);
    setExceptionDialogOpen(false);
    toast.success('Exceção registrada. Você pode salvar a evolução.');
  };

  const getAlertStyle = (level: string) => {
    switch (level) {
      case 'critico':
        return 'bg-destructive/10 border-destructive/50 text-destructive';
      case 'importante':
        return 'bg-amber-500/10 border-amber-500/50 text-amber-600';
      case 'leve':
        return 'bg-blue-500/10 border-blue-500/50 text-blue-600';
      default:
        return 'bg-muted border-border';
    }
  };

  if (!hasAlerts && completedTests.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {criticalAlerts.length > 0 && (
          <Alert variant="destructive" className="py-2">
            <XCircle className="h-4 w-4" />
            <AlertTitle className="text-sm">
              {criticalAlerts.length} teste(s) crítico(s) pendente(s)
            </AlertTitle>
            <AlertDescription className="text-xs">
              Bloqueando salvamento da evolução.
            </AlertDescription>
          </Alert>
        )}

        {importantAlerts.length > 0 && (
          <Alert className="py-2 border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-sm text-amber-600">
              {importantAlerts.length} teste(s) importante(s) pendente(s)
            </AlertTitle>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <>
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-primary" />
            Testes Obrigatórios da Sessão
            {!hasAlerts && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 ml-auto">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Todos Completos
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Alertas Críticos */}
          {criticalAlerts.length > 0 && (
            <Alert variant="destructive">
              <FileWarning className="h-4 w-4" />
              <AlertTitle className="font-semibold">
                ⛔ Testes Críticos Pendentes ({criticalAlerts.length})
              </AlertTitle>
              <AlertDescription className="mt-2">
                <p className="text-sm mb-2">
                  Estes testes são obrigatórios e <strong>bloqueiam o salvamento</strong> da evolução.
                </p>
                <ScrollArea className="max-h-32">
                  <ul className="space-y-1">
                    {criticalAlerts.map((alert) => (
                      <li
                        key={alert.id}
                        className="flex items-center justify-between text-sm py-1 px-2 rounded bg-background/50"
                      >
                        <span className="flex items-center gap-2">
                          <XCircle className="h-3 w-3" />
                          {alert.test_config.test_name}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs"
                            onClick={() => onTestClick?.(alert.test_config.test_name)}
                          >
                            Realizar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs"
                            onClick={() => handleOpenException(alert.test_config.test_name)}
                          >
                            Exceção
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {/* Alertas Importantes */}
          {importantAlerts.length > 0 && (
            <Alert className={cn(getAlertStyle('importante'))}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Testes Importantes Pendentes ({importantAlerts.length})</AlertTitle>
              <AlertDescription className="mt-2">
                <ScrollArea className="max-h-24">
                  <ul className="space-y-1">
                    {importantAlerts.map((alert) => (
                      <li
                        key={alert.id}
                        className="flex items-center justify-between text-sm py-1"
                      >
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3" />
                          {alert.test_config.test_name}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs"
                          onClick={() => onTestClick?.(alert.test_config.test_name)}
                        >
                          Realizar
                        </Button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {/* Alertas Leves */}
          {lightAlerts.length > 0 && (
            <Alert className={cn(getAlertStyle('leve'))}>
              <Info className="h-4 w-4" />
              <AlertTitle>Testes Recomendados ({lightAlerts.length})</AlertTitle>
              <AlertDescription className="mt-2">
                <ul className="space-y-1">
                  {lightAlerts.map((alert) => (
                    <li
                      key={alert.id}
                      className="flex items-center justify-between text-sm py-1"
                    >
                      <span className="flex items-center gap-2">
                        <Info className="h-3 w-3" />
                        {alert.test_config.test_name}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        onClick={() => onTestClick?.(alert.test_config.test_name)}
                      >
                        Realizar
                      </Button>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Testes Completados */}
          {completedTests.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                ✓ {completedTests.length} teste(s) já realizado(s)
              </p>
              <div className="flex flex-wrap gap-1">
                {completedTests.map((test) => (
                  <Badge
                    key={test.id}
                    variant="outline"
                    className="bg-green-500/10 text-green-600 text-xs"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {test.test_config.test_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Exceção */}
      <Dialog open={exceptionDialogOpen} onOpenChange={setExceptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-amber-500" />
              Registrar Exceção
            </DialogTitle>
            <DialogDescription>
              Informe o motivo pelo qual o teste <strong>{selectedTest}</strong> não será
              realizado nesta sessão. Esta informação será registrada para auditoria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo da Exceção *</Label>
              <Textarea
                id="reason"
                placeholder="Ex: Paciente com dor aguda, teste adiado para próxima sessão..."
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                rows={4}
              />
            </div>

            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-600">
                Esta exceção será registrada no histórico do paciente e poderá ser
                auditada posteriormente.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExceptionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitException} disabled={!exceptionReason.trim()}>
              Registrar Exceção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
