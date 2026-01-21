import { useParams } from 'react-router-dom';
import { usePublicPrescription } from '@/hooks/usePrescriptions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Checkbox } from '@/components/shared/ui/checkbox';
import { Progress } from '@/components/shared/ui/progress';
import { Separator } from '@/components/shared/ui/separator';
import {
  CheckCircle2,
  Clock,
  Dumbbell,
  User,
  Calendar,
  Play,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function PublicPrescriptionPage() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const { prescription, loading, error, markExerciseComplete, isMarking } = usePublicPrescription(qrCode || '');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando sua prescrição...</p>
        </div>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-destructive/5 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle>Prescrição não encontrada</CardTitle>
            <CardDescription>
              O link pode estar incorreto ou a prescrição foi removida.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isExpired = prescription.valid_until && isAfter(new Date(), parseISO(prescription.valid_until));
  const completedExercises = Array.isArray(prescription.completed_exercises) 
    ? prescription.completed_exercises 
    : [];
  const exercises = Array.isArray(prescription.exercises) ? prescription.exercises : [];
  const progressPercent = exercises.length > 0 
    ? (completedExercises.length / exercises.length) * 100 
    : 0;

  const handleToggleExercise = (exerciseId: string) => {
    if (!isExpired && prescription) {
      markExerciseComplete({ prescriptionId: prescription.id, exerciseId });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-8">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell className="h-6 w-6" />
            <span className="text-lg font-bold">FisioFlow</span>
          </div>
          <h1 className="text-2xl font-bold">{prescription.title}</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">
            Sua prescrição personalizada de exercícios
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4">
        {/* Status Card */}
        <Card className="mb-4 shadow-lg">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 justify-between items-center">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{prescription.patient?.name || 'Paciente'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Válido até: {prescription.valid_until 
                    ? format(parseISO(prescription.valid_until), 'dd/MM/yyyy', { locale: ptBR })
                    : 'N/A'}
                </span>
              </div>

              {isExpired ? (
                <Badge variant="destructive">Expirada</Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Ativa
                </Badge>
              )}
            </div>

            <Separator className="my-4" />

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">
                  {completedExercises.length} de {exercises.length} exercícios
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              {progressPercent === 100 && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Parabéns! Você completou todos os exercícios!</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Exercises List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Exercícios ({exercises.length})
          </h2>

          {exercises.map((exercise, index: number) => {
            const isCompleted = completedExercises.includes(exercise.id);
            
            return (
              <Card 
                key={exercise.id} 
                className={cn(
                  "transition-all",
                  isCompleted && "bg-green-50 border-green-200"
                )}
              >
                <CardContent className="py-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 pt-1">
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => handleToggleExercise(exercise.id)}
                        disabled={isExpired || isMarking}
                        className="h-5 w-5"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={cn(
                          "font-medium",
                          isCompleted && "line-through text-muted-foreground"
                        )}>
                          {index + 1}. {exercise.name}
                        </h3>
                        {isCompleted && (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        )}
                      </div>

                      {exercise.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {exercise.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="outline" className="text-xs">
                          {exercise.sets} séries
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {exercise.repetitions} repetições
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {exercise.frequency}
                        </Badge>
                      </div>

                      {exercise.observations && (
                        <p className="text-sm text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2">
                          💡 {exercise.observations}
                        </p>
                      )}

                      {exercise.video_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => window.open(exercise.video_url, '_blank')}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Ver demonstração
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Notes */}
        {prescription.notes && (
          <Card className="mt-4 bg-amber-50 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                📝 Observações do Fisioterapeuta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-900">{prescription.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Therapist Info */}
        {prescription.therapist?.full_name && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Prescrição elaborada por</p>
            <p className="font-medium text-foreground">
              {prescription.therapist.full_name}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Desenvolvido por FisioFlow
          </p>
        </div>
      </div>
    </div>
  );
}
