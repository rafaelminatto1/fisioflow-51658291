import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Info,
  Activity,
  Calendar,
  Target,
} from "lucide-react";
import { useProgressAnalysis, ProgressAlert } from "@/hooks/useProgressAnalysis";

interface ProgressAnalysisCardProps {
  sessions: Array<{
    date: string;
    painLevel: number;
    mobilityScore: number;
  }>;
}

export const ProgressAnalysisCard = memo(function ProgressAnalysisCard({
  sessions,
}: ProgressAnalysisCardProps) {
  const analysis = useProgressAnalysis(sessions);

  if (!analysis) {
    return null;
  }

  const { metrics, alerts } = analysis;

  const getTrendIcon = () => {
    switch (metrics.trend) {
      case "improving":
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "declining":
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getTrendText = () => {
    switch (metrics.trend) {
      case "improving":
        return "Em Melhora";
      case "declining":
        return "Piorando";
      default:
        return "Estável";
    }
  };

  const getTrendColor = () => {
    switch (metrics.trend) {
      case "improving":
        return "text-green-500";
      case "declining":
        return "text-red-500";
      default:
        return "text-yellow-500";
    }
  };

  const getAlertIcon = (type: ProgressAlert["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5" />;
      case "danger":
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getAlertVariant = (type: ProgressAlert["type"]) => {
    switch (type) {
      case "success":
        return "default";
      case "warning":
        return "default";
      case "danger":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Análise de Progresso
            </CardTitle>
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <span className={`font-semibold ${getTrendColor()}`}>{getTrendText()}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Grid de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-primary" />
                <p className="text-sm text-muted-foreground">Duração</p>
              </div>
              <p className="text-2xl font-bold">{metrics.daysSinceStart} dias</p>
              <p className="text-xs text-muted-foreground mt-1">{metrics.sessionsCount} sessões</p>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-500" />
                <p className="text-sm text-muted-foreground">Redução de Dor</p>
              </div>
              <p className="text-2xl font-bold">
                {metrics.averagePainReduction > 0 ? "-" : ""}
                {Math.abs(metrics.averagePainReduction).toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Média por sessão: {metrics.improvementRate.toFixed(1)}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <p className="text-sm text-muted-foreground">Mobilidade</p>
              </div>
              <p className="text-2xl font-bold">
                {metrics.mobilityImprovement > 0 ? "+" : ""}
                {metrics.mobilityImprovement.toFixed(0)}%
              </p>
              <Progress
                value={Math.min(100, Math.max(0, metrics.mobilityImprovement))}
                className="h-2 mt-2"
              />
            </div>
          </div>

          {/* Badge de Estagnação */}
          {metrics.isStagnant && (
            <div className="flex items-center justify-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                Estagnação Detectada - Reavaliação Recomendada
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alertas e Recomendações */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <Alert key={index} variant={getAlertVariant(alert.type)} className="border-l-4">
              <div className="flex items-start gap-3">
                {getAlertIcon(alert.type)}
                <div className="flex-1 space-y-2">
                  <AlertTitle className="flex items-center gap-2">
                    {alert.title}
                    <Badge variant="outline" className="text-xs">
                      {alert.type === "success"
                        ? "✓"
                        : alert.type === "warning"
                          ? "!"
                          : alert.type === "danger"
                            ? "!!"
                            : "ℹ"}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>{alert.message}</p>
                    {alert.recommendation && (
                      <div className="mt-2 p-3 rounded-md bg-muted/50">
                        <p className="text-sm font-medium">💡 Recomendação:</p>
                        <p className="text-sm mt-1">{alert.recommendation}</p>
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
});
