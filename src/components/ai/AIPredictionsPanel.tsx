import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  Phone,
  MessageSquare,
  Mail,
  TrendingUp,
  Target,
  Zap,
  Calendar,
  User
} from 'lucide-react';
import { useAIPredictions, AppointmentPrediction } from '@/hooks/useAIPredictions';

interface PredictionCardProps {
  prediction: AppointmentPrediction;
  onActionTaken: (appointmentId: string) => void;
}

const PredictionCard: React.FC<PredictionCardProps> = ({ prediction, onActionTaken }) => {
  const [isActioning, setIsActioning] = useState(false);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const handleAction = async (action: string) => {
    setIsActioning(true);
    // Simula ação sendo executada
    await new Promise(resolve => setTimeout(resolve, 1000));
    onActionTaken(prediction.appointmentId);
    setIsActioning(false);
  };

  return (
    <Card className={`border-l-4 ${getRiskColor(prediction.riskLevel)} hover:shadow-md transition-all duration-200`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="font-semibold">{prediction.patientName}</span>
            </div>
            <Badge variant={getRiskBadgeVariant(prediction.riskLevel)}>
              {prediction.riskLevel === 'high' ? 'Alto Risco' :
               prediction.riskLevel === 'medium' ? 'Médio Risco' : 'Baixo Risco'}
            </Badge>
          </div>

          {/* Appointment Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {prediction.appointmentDate.toLocaleDateString('pt-BR')}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {prediction.appointmentTime}
            </div>
          </div>

          {/* Probability */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Probabilidade de No-Show</span>
              <span className="font-semibold">{Math.round(prediction.noShowProbability * 100)}%</span>
            </div>
            <Progress 
              value={prediction.noShowProbability * 100} 
              className="h-2"
            />
          </div>

          {/* Risk Factors */}
          {prediction.factors.length > 0 && (
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Fatores de Risco:</span>
              <ul className="text-xs space-y-1">
                {prediction.factors.map((factor, index) => (
                  <li key={index} className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-current rounded-full" />
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Actions */}
          {prediction.recommendedActions.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Ações Recomendadas:</span>
              <div className="flex flex-wrap gap-2">
                {prediction.recommendedActions.map((action, index) => {
                  const getActionIcon = (actionText: string) => {
                    if (actionText.includes('Ligar') || actionText.includes('telefone')) return Phone;
                    if (actionText.includes('WhatsApp') || actionText.includes('SMS')) return MessageSquare;
                    if (actionText.includes('Email')) return Mail;
                    return Zap;
                  };

                  const ActionIcon = getActionIcon(action);

                  return (
                    <Button
                      key={index}
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => handleAction(action)}
                      disabled={isActioning}
                    >
                      <ActionIcon className="w-3 h-3 mr-1" />
                      {action}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Confidence */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Confiança do Modelo: {Math.round(prediction.confidence * 100)}%</span>
            <span>ID: {prediction.appointmentId}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const AIPredictionsPanel: React.FC = () => {
  const {
    predictions,
    insights,
    isLoading,
    accuracy,
    getHighRiskPredictions,
    getMediumRiskPredictions,
    getLowRiskPredictions,
    getTodayPredictions,
    getAverageNoShowProbability,
    markPredictionAsActioned
  } = useAIPredictions();

  const [activeTab, setActiveTab] = useState('today');

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground ml-3">Carregando predições de IA...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const todayPredictions = getTodayPredictions();
  const highRiskPredictions = getHighRiskPredictions();
  const mediumRiskPredictions = getMediumRiskPredictions();
  const lowRiskPredictions = getLowRiskPredictions();
  const avgProbability = getAverageNoShowProbability();

  return (
    <div className="space-y-6">
      {/* Header com Estatísticas */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Sistema de Predição IA - No-Show
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-primary">{Math.round(accuracy * 100)}%</div>
              <div className="text-sm text-muted-foreground">Precisão do Modelo</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{highRiskPredictions.length}</div>
              <div className="text-sm text-muted-foreground">Alto Risco</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{mediumRiskPredictions.length}</div>
              <div className="text-sm text-muted-foreground">Médio Risco</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-primary">{Math.round(avgProbability * 100)}%</div>
              <div className="text-sm text-muted-foreground">Prob. Média</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights de IA */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight) => {
            const getInsightIcon = (type: string) => {
              switch (type) {
                case 'alert': return AlertTriangle;
                case 'prediction': return Brain;
                case 'optimization': return Target;
                default: return TrendingUp;
              }
            };

            const InsightIcon = getInsightIcon(insight.type);
            const priorityColor = insight.priority === 'high' ? 'border-l-red-500' :
                                insight.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500';

            return (
              <Alert key={insight.id} className={`border-l-4 ${priorityColor}`}>
                <InsightIcon className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">{insight.title}</p>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    {insight.actionable && (
                      <Button size="sm" variant="link" className="p-0 h-auto">
                        Tomar Ação →
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      {/* Tabs de Predições */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Predições Detalhadas</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="today">Hoje ({todayPredictions.length})</TabsTrigger>
              <TabsTrigger value="high">Alto Risco ({highRiskPredictions.length})</TabsTrigger>
              <TabsTrigger value="medium">Médio Risco ({mediumRiskPredictions.length})</TabsTrigger>
              <TabsTrigger value="low">Baixo Risco ({lowRiskPredictions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-4 mt-4">
              {todayPredictions.length > 0 ? (
                <div className="grid gap-4">
                  {todayPredictions.map((prediction) => (
                    <PredictionCard
                      key={prediction.appointmentId}
                      prediction={prediction}
                      onActionTaken={markPredictionAsActioned}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>Nenhum agendamento para hoje</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="high" className="space-y-4 mt-4">
              {highRiskPredictions.length > 0 ? (
                <div className="grid gap-4">
                  {highRiskPredictions.map((prediction) => (
                    <PredictionCard
                      key={prediction.appointmentId}
                      prediction={prediction}
                      onActionTaken={markPredictionAsActioned}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>Nenhum paciente de alto risco</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="medium" className="space-y-4 mt-4">
              {mediumRiskPredictions.length > 0 ? (
                <div className="grid gap-4">
                  {mediumRiskPredictions.map((prediction) => (
                    <PredictionCard
                      key={prediction.appointmentId}
                      prediction={prediction}
                      onActionTaken={markPredictionAsActioned}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>Nenhum paciente de médio risco</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="low" className="space-y-4 mt-4">
              {lowRiskPredictions.length > 0 ? (
                <div className="grid gap-4">
                  {lowRiskPredictions.map((prediction) => (
                    <PredictionCard
                      key={prediction.appointmentId}
                      prediction={prediction}
                      onActionTaken={markPredictionAsActioned}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>Nenhum paciente de baixo risco</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIPredictionsPanel;