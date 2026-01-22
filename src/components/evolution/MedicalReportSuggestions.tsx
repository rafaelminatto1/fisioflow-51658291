import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { ScrollArea } from '@/components/web/ui/scroll-area';
import { Separator } from '@/components/shared/ui/separator';
import {
  Lightbulb,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Calendar,
  FileText,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';


interface MedicalReportSuggestionsProps {
  patientId: string;
}

interface Insight {
  id: string;
  type: 'improvement' | 'milestone' | 'comparison' | 'recommendation';
  icon: React.ReactNode;
  title: string;
  description: string;
  data?: unknown;
  priority: 'high' | 'medium' | 'low';
}

export const MedicalReportSuggestions: React.FC<MedicalReportSuggestionsProps> = ({
  patientId
}) => {
  const { toast } = useToast();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);



  const generateInsights = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const generatedInsights: Insight[] = [];

      // Fetch patient data (Check if exists)
      await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      // Fetch SOAP records
      const { data: soapRecords } = await supabase
        .from('soap_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });

      // Fetch measurements
      const { data: measurements } = await supabase
        .from('evolution_measurements')
        .select('*')
        .eq('patient_id', patientId)
        .order('measured_at', { ascending: true });

      // Fetch appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'atendido')
        .order('appointment_date', { ascending: true });

      // Fetch goals
      const { data: goals } = await supabase
        .from('patient_goals')
        .select('*')
        .eq('patient_id', patientId);

      // Generate pain evolution insight
      const painMeasurements = measurements?.filter(m =>
        m.measurement_type === 'pain' || m.measurement_name.toLowerCase().includes('dor')
      );

      if (painMeasurements && painMeasurements.length >= 2) {
        const firstPain = painMeasurements[0].value;
        const lastPain = painMeasurements[painMeasurements.length - 1].value;
        const sessions = soapRecords?.length || 0;

        if (lastPain < firstPain) {
          generatedInsights.push({
            id: 'pain_reduction',
            type: 'improvement',
            icon: <TrendingDown className="h-4 w-4 text-green-500" />,
            title: 'Redução de Dor',
            description: `Paciente apresentou redução de dor de ${firstPain}/10 para ${lastPain}/10 em ${sessions} sessões de tratamento.`,
            priority: 'high'
          });
        }
      }

      // Generate ROM improvement insight
      const romMeasurements = measurements?.filter(m =>
        m.measurement_type === 'rom' || m.measurement_name.toLowerCase().includes('amplitude')
      );

      if (romMeasurements && romMeasurements.length >= 2) {
        const firstROM = romMeasurements[0].value;
        const lastROM = romMeasurements[romMeasurements.length - 1].value;
        const improvement = ((lastROM - firstROM) / firstROM * 100).toFixed(0);

        if (lastROM > firstROM) {
          generatedInsights.push({
            id: 'rom_improvement',
            type: 'improvement',
            icon: <TrendingUp className="h-4 w-4 text-blue-500" />,
            title: 'Ganho de Amplitude',
            description: `Amplitude de movimento aumentou ${improvement}% desde a avaliação inicial (${firstROM}° → ${lastROM}°).`,
            priority: 'high'
          });
        }
      }

      // Generate treatment duration insight
      if (appointments && appointments.length > 0) {
        const firstDate = new Date(appointments[0].appointment_date);
        const lastDate = new Date(appointments[appointments.length - 1].appointment_date);
        const daysInTreatment = differenceInDays(lastDate, firstDate);
        const weeks = Math.floor(daysInTreatment / 7);

        generatedInsights.push({
          id: 'treatment_duration',
          type: 'milestone',
          icon: <Calendar className="h-4 w-4 text-purple-500" />,
          title: 'Tempo de Tratamento',
          description: `Paciente em acompanhamento há ${weeks > 0 ? `${weeks} semanas` : `${daysInTreatment} dias`}, com ${appointments.length} sessões realizadas.`,
          priority: 'medium'
        });
      }

      // Generate attendance rate insight
      if (appointments) {
        const { count: totalScheduled } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', patientId);

        const attendanceRate = ((appointments.length / (totalScheduled || 1)) * 100).toFixed(0);

        if (Number(attendanceRate) >= 80) {
          generatedInsights.push({
            id: 'attendance',
            type: 'milestone',
            icon: <Activity className="h-4 w-4 text-green-500" />,
            title: 'Boa Adesão',
            description: `Taxa de presença de ${attendanceRate}%, demonstrando excelente adesão ao tratamento.`,
            priority: 'medium'
          });
        }
      }

      // Generate goal progress insight
      const completedGoals = goals?.filter(g => g.status === 'completed') || [];
      if (completedGoals.length > 0) {
        generatedInsights.push({
          id: 'goals_completed',
          type: 'milestone',
          icon: <Target className="h-4 w-4 text-amber-500" />,
          title: 'Objetivos Alcançados',
          description: `${completedGoals.length} objetivo(s) terapêutico(s) alcançado(s): ${completedGoals.map(g => g.goal_title).join(', ')}.`,
          priority: 'high'
        });
      }

      // Generate strength improvement insight
      const strengthMeasurements = measurements?.filter(m =>
        m.measurement_type === 'strength' || m.measurement_name.toLowerCase().includes('força')
      );

      if (strengthMeasurements && strengthMeasurements.length >= 2) {
        const firstStrength = strengthMeasurements[0].value;
        const lastStrength = strengthMeasurements[strengthMeasurements.length - 1].value;

        if (lastStrength > firstStrength) {
          generatedInsights.push({
            id: 'strength_improvement',
            type: 'improvement',
            icon: <TrendingUp className="h-4 w-4 text-orange-500" />,
            title: 'Ganho de Força',
            description: `Teste de força muscular: evolução de grau ${firstStrength} para grau ${lastStrength}.`,
            priority: 'medium'
          });
        }
      }

      // Add recommendation based on progress
      if (generatedInsights.filter(i => i.type === 'improvement').length >= 2) {
        generatedInsights.push({
          id: 'recommendation',
          type: 'recommendation',
          icon: <Sparkles className="h-4 w-4 text-indigo-500" />,
          title: 'Recomendação',
          description: 'Paciente apresenta evolução satisfatória. Considerar progressão do protocolo de exercícios e reavaliação dos objetivos.',
          priority: 'low'
        });
      }

      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsLoading(false);
    }

  }, [patientId]);

  useEffect(() => {
    generateInsights();
  }, [generateInsights]);

  const copyToClipboard = (insight: Insight) => {
    navigator.clipboard.writeText(insight.description);
    setCopiedId(insight.id);
    toast({
      title: 'Copiado!',
      description: 'Texto copiado para a área de transferência.'
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAllInsights = () => {
    const allText = insights.map(i => `• ${i.description}`).join('\n');
    navigator.clipboard.writeText(allText);
    toast({
      title: 'Todos os insights copiados!',
      description: 'Texto completo copiado para a área de transferência.'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'low': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'improvement': return 'Melhora';
      case 'milestone': return 'Marco';
      case 'comparison': return 'Comparação';
      case 'recommendation': return 'Sugestão';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Gerando insights...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Sugestões para Relatório
          </CardTitle>
          {insights.length > 0 && (
            <Button variant="outline" size="sm" onClick={copyAllInsights}>
              <FileText className="h-4 w-4 mr-2" />
              Copiar Todos
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum insight disponível ainda.</p>
            <p className="text-sm">Registre mais evoluções para gerar sugestões automáticas.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <React.Fragment key={insight.id}>
                  <div className="group relative p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {insight.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{insight.title}</span>
                          <Badge variant="secondary" className={`text-xs ${getPriorityColor(insight.priority)}`}>
                            {getTypeLabel(insight.type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {insight.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                        onClick={() => copyToClipboard(insight)}
                      >
                        {copiedId === insight.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {index < insights.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default MedicalReportSuggestions;
