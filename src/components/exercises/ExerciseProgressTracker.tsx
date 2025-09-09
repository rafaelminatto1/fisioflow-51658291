import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Clock,
  Target,
  Activity,
  AlertCircle,
  CheckCircle,
  BarChart3,
  LineChart,
  Plus,
  Edit,
  Save,
  X,
  Zap,
  Heart,
  Award
} from 'lucide-react';
import { useExerciseProtocols } from '@/hooks/useExerciseProtocols';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExerciseProgressTrackerProps {
  patientId: string;
  sessionId?: string;
  exercises?: Array<{
    exercise_id: string;
    exercise_name: string;
    sets_planned: number;
    reps_planned: number;
    weight_kg?: number;
    duration_seconds?: number;
  }>;
}

interface ProgressEntry {
  exercise_id: string;
  exercise_name: string;
  sets_planned: number;
  sets_completed: number;
  reps_planned: number;
  reps_completed: number;
  weight_kg?: number;
  duration_seconds?: number;
  difficulty_rating: 'easy' | 'appropriate' | 'difficult';
  pain_before: number;
  pain_after: number;
  patient_feedback: string;
  therapist_notes: string;
}

export function ExerciseProgressTracker({ 
  patientId, 
  sessionId, 
  exercises = [] 
}: ExerciseProgressTrackerProps) {
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [saving, setSaving] = useState(false);
  
  const { 
    recordExerciseProgress, 
    getExerciseAnalytics, 
    getPatientProgressSummary,
    fetchPatientProgress,
    patientProgress 
  } = useExerciseProtocols();
  
  const { toast } = useToast();

  const analytics = useMemo(() => 
    getExerciseAnalytics(patientId), 
    [patientId, getExerciseAnalytics]
  );

  const progressSummary = useMemo(() => 
    getPatientProgressSummary(patientId), 
    [patientId, getPatientProgressSummary]
  );

  useEffect(() => {
    fetchPatientProgress(patientId);
    
    // Initialize progress entries from planned exercises
    if (exercises.length > 0) {
      const initialEntries = exercises.map(exercise => ({
        exercise_id: exercise.exercise_id,
        exercise_name: exercise.exercise_name,
        sets_planned: exercise.sets_planned,
        sets_completed: 0,
        reps_planned: exercise.reps_planned,
        reps_completed: 0,
        weight_kg: exercise.weight_kg,
        duration_seconds: exercise.duration_seconds,
        difficulty_rating: 'appropriate' as const,
        pain_before: 0,
        pain_after: 0,
        patient_feedback: '',
        therapist_notes: '',
      }));
      setProgressEntries(initialEntries);
    }
  }, [patientId, exercises, fetchPatientProgress]);

  const updateProgressEntry = (exerciseId: string, updates: Partial<ProgressEntry>) => {
    setProgressEntries(prev => 
      prev.map(entry => 
        entry.exercise_id === exerciseId 
          ? { ...entry, ...updates }
          : entry
      )
    );
  };

  const handleSaveProgress = async () => {
    if (progressEntries.length === 0) {
      toast({
        title: 'Erro',
        description: 'Nenhum progresso para salvar',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      for (const entry of progressEntries) {
        const adherencePercentage = Math.round(
          ((entry.sets_completed / entry.sets_planned) * 
           (entry.reps_completed / entry.reps_planned)) * 100
        );

        await recordExerciseProgress({
          patient_id: patientId,
          exercise_id: entry.exercise_id,
          exercise_name: entry.exercise_name,
          date: new Date(),
          sets_planned: entry.sets_planned,
          sets_completed: entry.sets_completed,
          reps_planned: entry.reps_planned,
          reps_completed: entry.reps_completed,
          weight_kg: entry.weight_kg,
          duration_seconds: entry.duration_seconds,
          difficulty_rating: entry.difficulty_rating,
          pain_before: entry.pain_before,
          pain_after: entry.pain_after,
          patient_feedback: entry.patient_feedback,
          therapist_notes: entry.therapist_notes,
          adherence_percentage: adherencePercentage,
          session_id: sessionId,
        });
      }

      toast({
        title: 'Sucesso',
        description: 'Progresso dos exercícios salvo com sucesso'
      });

      // Refresh analytics
      fetchPatientProgress(patientId);
    } catch (error) {
      console.error('Error saving progress:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar progresso dos exercícios',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getPainImprovementIcon = (before: number, after: number) => {
    const improvement = before - after;
    if (improvement > 0) return <TrendingDown className="w-4 h-4 text-green-500" />;
    if (improvement < 0) return <TrendingUp className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4 text-gray-500" />;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-blue-600 bg-blue-50';
      case 'appropriate': return 'text-green-600 bg-green-50';
      case 'difficult': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{progressSummary.totalExercisesSessions}</p>
                <p className="text-sm text-muted-foreground">Sessões Totais</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(progressSummary.averageAdherence)}%</p>
                <p className="text-sm text-muted-foreground">Adesão Média</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{progressSummary.averagePainImprovement.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Redução Dor</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(progressSummary.overallEffectiveness * 100)}%</p>
                <p className="text-sm text-muted-foreground">Efetividade</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Session Progress */}
      {progressEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Progresso da Sessão Atual
              </span>
              <Button onClick={handleSaveProgress} disabled={saving}>
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Progresso
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {progressEntries.map((entry, _index) => (
              <Card key={entry.exercise_id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-lg">{entry.exercise_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Planejado: {entry.sets_planned} × {entry.reps_planned}
                        </p>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs">Séries Completadas</Label>
                        <Input
                          type="number"
                          min="0"
                          max={entry.sets_planned}
                          value={entry.sets_completed}
                          onChange={(e) => updateProgressEntry(entry.exercise_id, { 
                            sets_completed: parseInt(e.target.value) || 0 
                          })}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Reps Completadas</Label>
                        <Input
                          type="number"
                          min="0"
                          value={entry.reps_completed}
                          onChange={(e) => updateProgressEntry(entry.exercise_id, { 
                            reps_completed: parseInt(e.target.value) || 0 
                          })}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Peso Usado (kg)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={entry.weight_kg || ''}
                          onChange={(e) => updateProgressEntry(entry.exercise_id, { 
                            weight_kg: e.target.value ? parseFloat(e.target.value) : undefined 
                          })}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Duração (s)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={entry.duration_seconds || ''}
                          onChange={(e) => updateProgressEntry(entry.exercise_id, { 
                            duration_seconds: e.target.value ? parseInt(e.target.value) : undefined 
                          })}
                          className="h-8"
                        />
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progresso da Sessão</span>
                        <span>{Math.round(((entry.sets_completed / entry.sets_planned) * 100))}%</span>
                      </div>
                      <Progress 
                        value={(entry.sets_completed / entry.sets_planned) * 100} 
                        className="h-2"
                      />
                    </div>

                    {/* Pain and Difficulty */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs flex items-center gap-1">
                          Dor Antes (0-10)
                        </Label>
                        <Select
                          value={entry.pain_before.toString()}
                          onValueChange={(value) => updateProgressEntry(entry.exercise_id, { 
                            pain_before: parseInt(value) 
                          })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[...Array(11)].map((_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i} {i === 0 ? '(Sem dor)' : i === 10 ? '(Dor máxima)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Dor Depois (0-10)</Label>
                        <Select
                          value={entry.pain_after.toString()}
                          onValueChange={(value) => updateProgressEntry(entry.exercise_id, { 
                            pain_after: parseInt(value) 
                          })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[...Array(11)].map((_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i} {i === 0 ? '(Sem dor)' : i === 10 ? '(Dor máxima)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Dificuldade</Label>
                        <Select
                          value={entry.difficulty_rating}
                          onValueChange={(value: 'easy' | 'appropriate' | 'difficult') => updateProgressEntry(entry.exercise_id, { 
                            difficulty_rating: value 
                          })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Muito Fácil</SelectItem>
                            <SelectItem value="appropriate">Adequado</SelectItem>
                            <SelectItem value="difficult">Muito Difícil</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Feedback */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs">Feedback do Paciente</Label>
                        <Textarea
                          value={entry.patient_feedback}
                          onChange={(e) => updateProgressEntry(entry.exercise_id, { 
                            patient_feedback: e.target.value 
                          })}
                          placeholder="Como o paciente se sentiu durante o exercício..."
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Observações do Terapeuta</Label>
                        <Textarea
                          value={entry.therapist_notes}
                          onChange={(e) => updateProgressEntry(entry.exercise_id, { 
                            therapist_notes: e.target.value 
                          })}
                          placeholder="Observações técnicas, modificações realizadas..."
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {/* Pain Change Indicator */}
                    {entry.pain_before !== entry.pain_after && (
                      <div className="flex items-center gap-2 text-sm">
                        {getPainImprovementIcon(entry.pain_before, entry.pain_after)}
                        <span className={entry.pain_before > entry.pain_after ? 'text-green-600' : 'text-red-600'}>
                          Dor {entry.pain_before > entry.pain_after ? 'reduziu' : 'aumentou'} em{' '}
                          {Math.abs(entry.pain_before - entry.pain_after)} ponto(s)
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Exercise Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Análise de Desempenho
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
            >
              {showAnalytics ? 'Ocultar' : 'Ver Detalhes'}
            </Button>
          </CardTitle>
        </CardHeader>
        
        {showAnalytics && (
          <CardContent>
            <div className="space-y-4">
              {analytics.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum dado de progresso disponível ainda
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.map((analysis) => (
                    <Card key={analysis.exercise_id} className="border-dashed">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-semibold">{analysis.exercise_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {analysis.total_sessions} sessões • Última: {' '}
                              {format(analysis.last_performed, 'dd MMM', { locale: ptBR })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getTrendIcon(analysis.trend)}
                            <Badge variant="outline" className={getDifficultyColor(analysis.trend)}>
                              {analysis.trend === 'improving' ? 'Melhorando' : 
                               analysis.trend === 'declining' ? 'Declinando' : 'Estável'}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {analysis.average_adherence}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Adesão Média
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {analysis.progression_rate}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Taxa Progressão
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {analysis.patient_satisfaction}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Satisfação
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                              {Math.round(analysis.effectiveness_score * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Efetividade
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}