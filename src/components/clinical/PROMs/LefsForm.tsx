import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Footprints } from "lucide-react";

const LEFS_ITEMS = [
  "Atividades normais de trabalho",
  "Atividades normais em casa",
  "Atividades recreativas que exigem agachamento (pescar, jardinagem)",
  "Caminhadas em superfície irregular",
  "Subir ou descer um lance de escadas",
  "Ficar em pé por 1 hora",
  "Ficar sentado(a) por 1 hora",
  "Correr em superfície plana",
  "Caminhar em superfície plana por 10 minutos",
  "Fazer compras",
  "Usar meias ou calçados",
  "Ajoelhar-se por 1 minuto",
  "Carregar objetos domésticos pesados",
  "Agachar",
  "Dançar",
  "Circular dentro de casa",
  "Atividades desportivas de impacto baixo (natação)",
  "Atividades desportivas de impacto médio (caminhar rapidamente)",
  "Atividades desportivas de impacto alto (correr, pular)",
  "Capacidade sexual",
];

const LEFS_OPTIONS = [
  { value: "0", label: "Incapaz" },
  { value: "1", label: "Dif. extrema" },
  { value: "2", label: "Grande dif." },
  { value: "3", label: "Pouca dif." },
  { value: "4", label: "Sem dif." },
];

interface LefsFormProps {
  patientId: string;
  sessionId?: string;
  onSave: (score: number, responses: Record<string, unknown>) => void;
  onCancel: () => void;
}

function getLefsInterpretation(score: number): {
  label: string;
  color: string;
} {
  if (score <= 40) return { label: "Incapacidade grave", color: "bg-red-100 text-red-800" };
  if (score <= 60)
    return {
      label: "Incapacidade moderada",
      color: "bg-yellow-100 text-yellow-800",
    };
  return { label: "Incapacidade leve", color: "bg-green-100 text-green-800" };
}

function getScoreColor(score: number): string {
  const pct = (score / 80) * 100;
  if (pct >= 75) return "text-green-600";
  if (pct >= 50) return "text-yellow-600";
  return "text-red-600";
}

export function LefsForm({ onSave, onCancel }: LefsFormProps) {
  const [responses, setResponses] = useState<Record<number, number>>({});

  const answeredCount = Object.keys(responses).length;
  const totalItems = LEFS_ITEMS.length;
  const totalScore = Object.values(responses).reduce((sum, v) => sum + v, 0);
  const maxPossible = answeredCount * 4;
  const interpretation = answeredCount === totalItems ? getLefsInterpretation(totalScore) : null;

  const setResponse = (index: number, value: number) => {
    setResponses((prev) => ({ ...prev, [index]: value }));
  };

  const handleSubmit = () => {
    if (answeredCount < totalItems) return;
    const responsePayload: Record<string, unknown> = {};
    LEFS_ITEMS.forEach((item, i) => {
      responsePayload[`q${i + 1}`] = responses[i];
      responsePayload[`q${i + 1}_label`] = item;
    });
    responsePayload.max_score = 80;
    onSave(totalScore, responsePayload);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Footprints className="h-5 w-5 text-green-500" />
          <CardTitle className="text-lg">LEFS — Escala Funcional dos Membros Inferiores</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          20 itens sobre função dos membros inferiores. Score máximo: 80 pontos. MCID: 9 pontos.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-md border bg-blue-50/50 p-3 text-sm text-blue-800">
          <p className="font-medium mb-1">Instrução:</p>
          <p>
            Estamos interessados em saber se você tem dificuldade em realizar as atividades listadas
            abaixo por causa do seu problema com o membro inferior. Selecione a opção que melhor
            descreve sua capacidade atual para cada atividade.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 max-h-[520px] overflow-y-auto pr-1">
          {LEFS_ITEMS.map((item, index) => (
            <div
              key={index}
              className={`rounded-md border p-3 space-y-2 transition-colors ${
                responses[index] !== undefined ? "bg-green-50/40 border-green-200" : "bg-card"
              }`}
            >
              <div className="flex items-start gap-1.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground mt-0.5">
                  {index + 1}
                </span>
                <p className="text-sm font-medium leading-snug">{item}</p>
              </div>
              <RadioGroup
                value={responses[index]?.toString()}
                onValueChange={(v) => setResponse(index, Number(v))}
                className="grid grid-cols-5 gap-1"
              >
                {LEFS_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex flex-col items-center gap-1">
                    <RadioGroupItem
                      value={opt.value}
                      id={`lefs-q${index}-${opt.value}`}
                      className="sr-only"
                    />
                    <Label
                      htmlFor={`lefs-q${index}-${opt.value}`}
                      className={`flex h-8 w-full cursor-pointer items-center justify-center rounded-md border text-xs font-medium transition-all ${
                        responses[index]?.toString() === opt.value
                          ? "border-green-500 bg-green-100 text-green-800"
                          : "border-border hover:border-green-300 hover:bg-green-50/50 text-muted-foreground"
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
          ))}
        </div>

        <div className="rounded-md border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progresso:</span>
            <span className="text-sm text-muted-foreground">
              {answeredCount}/{totalItems} respondidos
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Score LEFS:</span>
            <div className="flex items-center gap-1">
              <span className={`text-2xl font-bold tabular-nums ${getScoreColor(totalScore)}`}>
                {totalScore}
              </span>
              <span className="text-muted-foreground">
                / {answeredCount === totalItems ? "80" : maxPossible}
              </span>
            </div>
          </div>
          {interpretation && <Badge className={interpretation.color}>{interpretation.label}</Badge>}
        </div>

        <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
          <p className="font-medium">Interpretação:</p>
          <div className="grid grid-cols-3 gap-x-3 text-muted-foreground text-xs">
            <span>0–40 = Grave</span>
            <span>41–60 = Moderada</span>
            <span>61–80 = Leve</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSubmit} disabled={answeredCount < totalItems} className="flex-1">
            {answeredCount < totalItems
              ? `Faltam ${totalItems - answeredCount} respostas`
              : `Salvar LEFS — ${totalScore}/80`}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
