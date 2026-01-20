/**
 * Smart Alerts Panel - Recent alerts with actions
 */

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Clock, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { useAcknowledgeAlert } from '@/hooks/analytics/useStrategicInsights';
import { toast } from '@/components/ui/use-toast';
import type { SmartAlertHistory } from '@/lib/analytics/strategic/types';

interface SmartAlertsPanelProps {
  alerts: SmartAlertHistory[];
  title?: string;
  description?: string;
}

export function SmartAlertsPanel({
  alerts,
  title = "Alertas Recentes",
  description = "Notificações inteligentes do sistema",
}: SmartAlertsPanelProps) {
  const acknowledgeAlert = useAcknowledgeAlert();

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert.mutateAsync({ alertId });
      toast({ title: "Alerta reconhecido" });
    } catch (error) {
      toast({
        title: "Erro ao reconhecer alerta",
        variant: "destructive",
      });
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning': return <Bell className="h-4 w-4 text-yellow-600" />;
      case 'info': return <Info className="h-4 w-4 text-blue-600" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-200 bg-red-50/50';
      case 'warning': return 'border-yellow-200 bg-yellow-50/50';
      case 'info': return 'border-blue-200 bg-blue-50/50';
      default: return 'border-gray-200';
    }
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum alerta ativo no momento.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.slice(0, 5).map((alert) => (
          <div
            key={alert.id}
            className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)} ${
              alert.status === 'acknowledged' ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start gap-2">
              {getSeverityIcon(alert.severity)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {alert.severity === 'critical' ? 'Crítico' :
                     alert.severity === 'warning' ? 'Aviso' : 'Info'}
                  </Badge>
                  {alert.status === 'acknowledged' && (
                    <Badge variant="outline" className="text-xs">
                      Reconhecido
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium">
                  Valor atual: {alert.metric_value?.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Threshold: {alert.threshold_value?.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {format(parseISO(alert.alert_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              {alert.status === 'triggered' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAcknowledge(alert.id)}
                  className="shrink-0"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
