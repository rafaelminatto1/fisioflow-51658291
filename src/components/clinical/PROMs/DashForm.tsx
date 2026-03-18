import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Hand } from 'lucide-react';

const DASH_ITEMS = [
  'Abrir um pote novo',
  'Escrever',
  'Virar uma chave',
  'Preparar uma refeição',
  'Empurrar uma porta pesada',
  'Colocar algo em uma prateleira acima da cabeça',
  'Realizar tarefas domésticas pesadas',
  'Cuidar do jardim/quintal',
  'Fazer camas',
  'Carregar sacola de compras',
  'Carregar objeto pesado (> 5 kg)',
  'Substituir lâmpada acima da cabeça',
  'Pentear ou secar o cabelo',
  'Lavar as costas',
  'Vestir-se',
  'Usar faca para cortar alimentos',
  'Atividades recreativas que exigem pouco esforço (jogar cartas)',
  'Atividades recreativas com impacto no braço (tênis, martelar)',
  'Atividades recreativas com movimentos livres do braço (frisbee, badminton)',
  'Transportar/ir de um lado para outro em transportes',
  'Atividade sexual',
  'Impacto do seu problema nos seus afazeres habituais (trabalho ou tarefas domésticas)',
  'Dor no braço, ombro ou mão',
  'Formigamento (sensação de agulhadas) no braço, ombro ou mão',
  'Fraqueza no braço, ombro ou mão',
  'Rigidez no braço, ombro ou mão',
  'Gravidade da dor ao realizar atividades específicas',
  'Dificuldade de dormir devido a dor',
  'Sinto-me incapaz, tenho menos autoconfiança',
  'Me preocupo com meu braço, ombro ou mão',
];

const OPTIONS = [
  { value: '1', label: 'Sem dificuldade' },
  { value: '2', label: 'Leve' },
  { value: '3', label: 'Moderada' },
  { value: '4', label: 'Muita dificuldade' },
  { value: '5', label: 'Incapaz' },
];

interface DashFormProps {
  patientId: string;
  sessionId?: string;
  onSave: (score: number, responses: Record<string, unknown>) => void;
  onCancel: () => void;
}

function getDashInterpretation(score: number): { label: string; color: string } {
  if (score < 20) return { label: 'Incapacidade leve', color: 'bg-green-100 text-green-800' };
  if (score <= 40) return { label: 'Incapacidade moderada', color: 'bg-yellow-100 text-yellow-800' };
  return { label: 'Incapacidade grave', color: 'bg-red-100 text-red-800' };
}

export function DashForm({ onSave, onCancel }: DashFormProps) {
  const [responses, setResponses] = useState<Record<number, number>>({});

  const answeredCount = Object.keys(responses).length;
  const totalItems = DASH_ITEMS.length;

  const rawScore = Object.values(responses).reduce((sum, v) => sum + v, 0);
  const dashScore =
    answeredCount === totalItems
      ? ((rawScore - totalItems) * 100) / (4 * totalItems)
      : null;

  const interpretation = dashScore !== null ? getDashInterpretation(dashScore) : null;

  const setResponse = (index: number, value: number) => {
    setResponses((prev) => ({ ...prev, [index]: value }));
  };

  const handleSubmit = () => {
    if (dashScore === null) return;
    const responsePayload: Record<string, unknown> = {};
    DASH_ITEMS.forEach((item, i) => {
      responsePayload[`q${i + 1}`] = responses[i];
      responsePayload[`q${i + 1}_label`] = item;
    });
    responsePayload.raw_score = rawScore;
    onSave(Number(dashScore.toFixed(1)), responsePayload);
  };

  const groups = [
    { label: 'Atividades físicas (itens 1–16)', items: DASH_ITEMS.slice(0, 16) },
    { label: 'Atividades de lazer e trabalho (itens 17–22)', items: DASH_ITEMS.slice(16, 22) },
    { label: 'Sintomas e impacto (itens 23–30)', items: DASH_ITEMS.slice(22, 30) },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Hand className="h-5 w-5 text-blue-500" />
          <CardTitle className="text-lg">DASH — Disabilities of the Arm, Shoulder and Hand</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          30 itens sobre dificuldades funcionais do membro superior. Score = (soma − 30) × 100 / 120.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-md border bg-blue-50/50 p-3 text-sm text-blue-800">
          <p className="font-medium mb-1">Instrução:</p>
          <p>
            Para cada atividade, selecione o número que melhor descreve sua capacidade na última semana,
            independentemente de qual mão ou braço você usa.
          </p>
        </div>

        <div className="space-y-5 max-h-[520px] overflow-y-auto pr-1">
          {groups.map((group, gi) => (
            <div key={gi} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide sticky top-0 bg-background py-1 z-10">
                {group.label}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {group.items.map((item, localIdx) => {
                  const globalIdx = gi === 0 ? localIdx : gi === 1 ? 16 + localIdx : 22 + localIdx;
                  return (
                    <div
                      key={globalIdx}
                      className={`rounded-md border p-3 space-y-2 transition-colors ${
                        responses[globalIdx] !== undefined ? 'bg-blue-50/40 border-blue-200' : 'bg-card'
                      }`}
                    >
                      <div className="flex items-start gap-1.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground mt-0.5">
                          {globalIdx + 1}
                        </span>
                        <p className="text-sm font-medium leading-snug">{item}</p>
                      </div>
                      <RadioGroup
                        value={responses[globalIdx]?.toString()}
                        onValueChange={(v) => setResponse(globalIdx, Number(v))}
                        className="grid grid-cols-5 gap-1"
                      >
                        {OPTIONS.map((opt) => (
                          <div key={opt.value} className="flex flex-col items-center gap-1">
                            <RadioGroupItem
                              value={opt.value}
                              id={`q${globalIdx}-${opt.value}`}
                              className="sr-only"
                            />
                            <Label
                              htmlFor={`q${globalIdx}-${opt.value}`}
                              className={`flex h-8 w-full cursor-pointer items-center justify-center rounded-md border text-xs font-medium transition-all ${
                                responses[globalIdx]?.toString() === opt.value
                                  ? 'border-blue-500 bg-blue-100 text-blue-800'
                                  : 'border-border hover:border-blue-300 hover:bg-blue-50/50 text-muted-foreground'
                              }`}
                            >
                              {opt.value}
                            </Label>
                            <span className="text-[10px] text-center text-muted-foreground leading-tight">
                              {opt.label}
                            </span>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-md border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progresso:</span>
            <span className="text-sm text-muted-foreground">
              {answeredCount}/{totalItems} respondidos
            </span>
          </div>
          {dashScore !== null && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Score DASH:</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold tabular-nums">{dashScore.toFixed(1)}</span>
                  <span className="text-muted-foreground">/100</span>
                </div>
              </div>
              {interpretation && (
                <Badge className={interpretation.color}>{interpretation.label}</Badge>
              )}
            </>
          )}
          {dashScore === null && answeredCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Responda todos os {totalItems} itens para calcular o score.
            </p>
          )}
        </div>

        <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
          <p className="font-medium">Interpretação:</p>
          <div className="grid grid-cols-3 gap-x-3 text-muted-foreground text-xs">
            <span>{'< 20 = Leve'}</span>
            <span>20–40 = Moderado</span>
            <span>{'> 40 = Grave'}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={answeredCount < totalItems}
            className="flex-1"
          >
            {answeredCount < totalItems
              ? `Faltam ${totalItems - answeredCount} respostas`
              : `Salvar DASH — ${dashScore?.toFixed(1)}/100`}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
