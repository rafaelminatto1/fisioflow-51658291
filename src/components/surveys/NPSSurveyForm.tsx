import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { useCreateSurvey, type CreateSurveyData } from '@/hooks/useSatisfactionSurveys';
import { cn } from '@/lib/utils';

interface NPSSurveyFormProps {
  patientId: string;
  appointmentId?: string;
  therapistId?: string;
  onComplete?: () => void;
}

export function NPSSurveyForm({
  patientId,
  appointmentId,
  therapistId,
  onComplete,
}: NPSSurveyFormProps) {
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [careQuality, setCareQuality] = useState<number | null>(null);
  const [professionalism, setProfessionalism] = useState<number | null>(null);
  const [facilityCleanliness, _setFacilityCleanliness] = useState<number | null>(null);
  const [schedulingEase, _setSchedulingEase] = useState<number | null>(null);
  const [communication, setCommunication] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');

  const createSurvey = useCreateSurvey();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (npsScore === null) {
      return;
    }

    const data: CreateSurveyData = {
      patient_id: patientId,
      appointment_id: appointmentId,
      therapist_id: therapistId,
      nps_score: npsScore,
      q_care_quality: careQuality || undefined,
      q_professionalism: professionalism || undefined,
      q_facility_cleanliness: facilityCleanliness || undefined,
      q_scheduling_ease: schedulingEase || undefined,
      q_communication: communication || undefined,
      comments: comments || undefined,
      suggestions: suggestions || undefined,
    };

    await createSurvey.mutateAsync(data);
    onComplete?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pesquisa de Satisfação (NPS)</CardTitle>
        <CardDescription>
          Sua opinião é muito importante para melhorarmos nossos serviços
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* NPS Score */}
          <div className="space-y-3">
            <Label>
              Em uma escala de 0 a 10, qual a probabilidade de você recomendar nossa clínica?
            </Label>
            <div className="flex items-center gap-2 flex-wrap">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setNpsScore(score)}
                  className={cn(
                    'w-12 h-12 rounded-lg border-2 transition-all',
                    npsScore === score
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted hover:border-primary/50'
                  )}
                >
                  {score}
                </button>
              ))}
            </div>
            {npsScore !== null && (
              <p className="text-sm text-muted-foreground">
                {npsScore <= 6 && 'Detrator - Obrigado pelo feedback, vamos melhorar!'}
                {npsScore >= 7 && npsScore <= 8 && 'Neutro - Obrigado pelo feedback!'}
                {npsScore >= 9 && 'Promotor - Obrigado pela confiança!'}
              </p>
            )}
          </div>

          {/* Quality Questions */}
          <div className="space-y-4">
            <Label>Questões Adicionais (Opcional)</Label>

            <div className="space-y-2">
              <Label className="text-sm">Qualidade do Atendimento</Label>
              <RadioGroup
                value={careQuality?.toString() || ''}
                onValueChange={(value) => setCareQuality(parseInt(value))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="care-1" />
                  <Label htmlFor="care-1">1 - Muito Ruim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="care-2" />
                  <Label htmlFor="care-2">2 - Ruim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="care-3" />
                  <Label htmlFor="care-3">3 - Regular</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4" id="care-4" />
                  <Label htmlFor="care-4">4 - Bom</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="5" id="care-5" />
                  <Label htmlFor="care-5">5 - Excelente</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Profissionalismo</Label>
              <RadioGroup
                value={professionalism?.toString() || ''}
                onValueChange={(value) => setProfessionalism(parseInt(value))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="prof-1" />
                  <Label htmlFor="prof-1">1 - Muito Ruim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="prof-2" />
                  <Label htmlFor="prof-2">2 - Ruim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="prof-3" />
                  <Label htmlFor="prof-3">3 - Regular</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4" id="prof-4" />
                  <Label htmlFor="prof-4">4 - Bom</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="5" id="prof-5" />
                  <Label htmlFor="prof-5">5 - Excelente</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Comunicação</Label>
              <RadioGroup
                value={communication?.toString() || ''}
                onValueChange={(value) => setCommunication(parseInt(value))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="comm-1" />
                  <Label htmlFor="comm-1">1 - Muito Ruim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="comm-2" />
                  <Label htmlFor="comm-2">2 - Ruim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="comm-3" />
                  <Label htmlFor="comm-3">3 - Regular</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4" id="comm-4" />
                  <Label htmlFor="comm-4">4 - Bom</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="5" id="comm-5" />
                  <Label htmlFor="comm-5">5 - Excelente</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">Comentários (Opcional)</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Deixe seus comentários sobre o atendimento..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggestions">Sugestões de Melhoria (Opcional)</Label>
            <Textarea
              id="suggestions"
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              placeholder="Como podemos melhorar?"
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={npsScore === null || createSurvey.isPending}>
            {createSurvey.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Pesquisa'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

