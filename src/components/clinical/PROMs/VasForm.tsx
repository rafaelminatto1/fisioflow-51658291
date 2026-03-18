import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Activity } from 'lucide-react';

interface VasFormProps {
  patientId: string;
  sessionId?: string;
  onSave: (score: number, responses: Record<string, unknown>) => void;
  onCancel: () => void;
}

function getVasInterpretation(score: number): { label: string; color: string } {
  if (score === 0) return { label: 'Sem dor', color: 'bg-green-100 text-green-800' };
  if (score <= 3) return { label: 'Dor leve', color: 'bg-green-100 text-green-700' };
  if (score <= 6) return { label: 'Dor moderada', color: 'bg-yellow-100 text-yellow-800' };
  if (score <= 9) return { label: 'Dor intensa', color: 'bg-orange-100 text-orange-800' };
  return { label: 'Dor máxima', color: 'bg-red-100 text-red-800' };
}

function getSliderColor(score: number): string {
  if (score <= 3) return '#22c55e';
  if (score <= 6) return '#eab308';
  if (score <= 8) return '#f97316';
  return '#ef4444';
}

export function VasForm({ onSave, onCancel }: VasFormProps) {
  const [score, setScore] = useState(0);
  const [notes, setNotes] = useState('');

  const interpretation = getVasInterpretation(score);
  const sliderColor = getSliderColor(score);

  const handleSubmit = () => {
    onSave(score, { vas_score: score, notes });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          <CardTitle className="text-lg">Escala Visual Analógica (EVA/VAS)</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Avaliação da intensidade da dor percebida pelo paciente. MCID: 1,5 pontos.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Instrução: Indique a intensidade da sua dor no momento atual, onde 0 significa nenhuma dor
            e 10 significa a pior dor imaginável.
          </Label>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 — Sem dor</span>
            <span>5 — Dor moderada</span>
            <span>10 — Pior dor imaginável</span>
          </div>

          <div className="relative px-1">
            <div
              className="h-3 rounded-full mb-2 opacity-30"
              style={{
                background: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444)',
              }}
            />
            <Slider
              min={0}
              max={10}
              step={1}
              value={[score]}
              onValueChange={([v]) => setScore(v)}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-center gap-4">
            <div
              className="text-5xl font-bold tabular-nums transition-colors duration-200"
              style={{ color: sliderColor }}
            >
              {score}
            </div>
            <div className="text-muted-foreground text-lg">/</div>
            <div className="text-2xl text-muted-foreground font-light">10</div>
          </div>

          <div className="flex justify-center">
            <Badge className={interpretation.color}>{interpretation.label}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1 text-center">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setScore(i)}
              className={`rounded-md py-1 text-xs font-medium transition-all border ${
                score === i
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-border hover:border-blue-300 hover:bg-blue-50/50 text-muted-foreground'
              }`}
            >
              {i}
            </button>
          ))}
        </div>

        <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
          <p className="font-medium">Referência de interpretação:</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
            <span>0 = Sem dor</span>
            <span>1–3 = Leve</span>
            <span>4–6 = Moderada</span>
            <span>7–9 = Intensa</span>
            <span>10 = Máxima</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vas-notes">Observações (opcional)</Label>
          <Textarea
            id="vas-notes"
            placeholder="Localização da dor, fatores agravantes, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSubmit} className="flex-1">
            Salvar EVA — Score: {score}/10
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
