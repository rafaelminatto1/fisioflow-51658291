import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, PersonStanding } from "lucide-react";

interface BergItem {
  title: string;
  options: string[];
}

const BERG_ITEMS: BergItem[] = [
  {
    title: "1. Da posição sentada para em pé",
    options: [
      "(0) Necessita de ajuda moderada a máxima para levantar",
      "(1) Necessita de mínima ajuda para levantar ou estabilizar",
      "(2) Capaz de levantar usando as mãos, após várias tentativas",
      "(3) Capaz de levantar independentemente usando as mãos",
      "(4) Capaz de levantar sem usar as mãos e estabilizar independentemente",
    ],
  },
  {
    title: "2. Em pé sem apoio",
    options: [
      "(0) Incapaz de permanecer em pé sem apoio por 30 segundos",
      "(1) Necessita de várias tentativas para permanecer em pé 30 segundos",
      "(2) Capaz de permanecer em pé por 30 segundos",
      "(3) Capaz de permanecer em pé com segurança por 2 minutos, com supervisão",
      "(4) Capaz de permanecer em pé com segurança por 2 minutos",
    ],
  },
  {
    title: "3. Sentado sem encosto, pés apoiados no chão",
    options: [
      "(0) Incapaz de permanecer sentado sem apoio por 10 segundos",
      "(1) Capaz de permanecer sentado por 10 segundos",
      "(2) Capaz de permanecer sentado por 30 segundos",
      "(3) Capaz de permanecer sentado com segurança por 2 minutos, com supervisão",
      "(4) Capaz de permanecer sentado com segurança por 2 minutos",
    ],
  },
  {
    title: "4. Da posição em pé para sentada",
    options: [
      "(0) Necessita de ajuda para sentar",
      "(1) Senta independentemente, mas a descida não é controlada",
      "(2) Usa a parte posterior das pernas na cadeira para controlar a descida",
      "(3) Controla a descida usando as mãos",
      "(4) Senta com segurança com mínimo uso das mãos",
    ],
  },
  {
    title: "5. Transferências",
    options: [
      "(0) Necessita de dois assistentes para transferência",
      "(1) Necessita de um assistente para transferência",
      "(2) Capaz de transferir com dicas verbais e/ou supervisão",
      "(3) Capaz de transferir com segurança com uso das mãos",
      "(4) Capaz de transferir com segurança com mínimo uso das mãos",
    ],
  },
  {
    title: "6. Em pé sem apoio com olhos fechados",
    options: [
      "(0) Necessita de ajuda para não cair",
      "(1) Incapaz de manter olhos fechados por 3 segundos, mas fica em pé com segurança",
      "(2) Capaz de permanecer em pé por 3 segundos",
      "(3) Capaz de permanecer em pé por 10 segundos com supervisão",
      "(4) Capaz de permanecer em pé com segurança por 10 segundos",
    ],
  },
  {
    title: "7. Em pé sem apoio com pés unidos",
    options: [
      "(0) Necessita de ajuda para alcançar a posição e não consegue sustentá-la por 15 segundos",
      "(1) Necessita de ajuda para alcançar a posição, mas capaz de permanecer por 15 segundos",
      "(2) Capaz de juntar os pés independentemente, mas não consegue sustentá-la por 30 segundos",
      "(3) Capaz de juntar os pés independentemente e permanecer por 1 minuto, com supervisão",
      "(4) Capaz de juntar os pés independentemente e permanecer por 1 minuto com segurança",
    ],
  },
  {
    title: "8. Alcançar à frente com o braço estendido em pé",
    options: [
      "(0) Perde o equilíbrio ao tentar / necessita de suporte externo",
      "(1) Alcança menos de 5 cm",
      "(2) Alcança de 5 a 12 cm com segurança",
      "(3) Alcança mais de 12 cm com segurança",
      "(4) Alcança mais de 25 cm com segurança",
    ],
  },
  {
    title: "9. Pegar um objeto do chão a partir da posição em pé",
    options: [
      "(0) Incapaz de tentar / necessita de assistência para não perder equilíbrio",
      "(1) Incapaz de pegar e necessita de supervisão ao tentar",
      "(2) Incapaz de pegar, mas chega de 2 a 5 cm do objeto e mantém equilíbrio",
      "(3) Capaz de pegar o objeto, mas necessita de supervisão",
      "(4) Capaz de pegar o objeto com segurança e facilidade",
    ],
  },
  {
    title: "10. Virar-se e olhar para trás por cima dos ombros em pé",
    options: [
      "(0) Necessita de assistência ao virar",
      "(1) Necessita de supervisão ao virar",
      "(2) Vira apenas para os lados, mas mantém equilíbrio",
      "(3) Olha para trás por um lado apenas; o outro lado mostra menor deslocamento do peso",
      "(4) Olha para trás por ambos os lados com deslocamento de peso adequado",
    ],
  },
  {
    title: "11. Girar 360 graus",
    options: [
      "(0) Necessita de assistência ao girar",
      "(1) Necessita de supervisão próxima ou dicas verbais",
      "(2) Capaz de girar 360 graus com segurança, mas de forma lenta",
      "(3) Capaz de girar 360 graus com segurança em ≤ 4 segundos somente para um lado",
      "(4) Capaz de girar 360 graus com segurança em ≤ 4 segundos para ambos os lados",
    ],
  },
  {
    title: "12. Colocar os pés alternadamente em um banco",
    options: [
      "(0) Necessita de assistência para não cair / incapaz de tentar",
      "(1) Capaz de completar mais de 2 apoios com mínima assistência",
      "(2) Capaz de completar 4 apoios sem ajuda, mas necessita de supervisão",
      "(3) Capaz de completar 8 apoios em mais de 20 segundos com supervisão",
      "(4) Capaz de completar 8 apoios em ≤ 20 segundos com segurança e sem apoio",
    ],
  },
  {
    title: "13. Em pé sem apoio com um pé à frente do outro (tandem)",
    options: [
      "(0) Perde o equilíbrio ao dar o passo ou ao ficar em pé",
      "(1) Necessita de ajuda para dar o passo, mas pode ficar por 15 segundos",
      "(2) Capaz de dar um pequeno passo independentemente e ficar por 30 segundos",
      "(3) Capaz de colocar um pé à frente do outro independentemente e ficar por 30 segundos",
      "(4) Capaz de posicionar os pés em tandem independentemente e ficar por 1 minuto",
    ],
  },
  {
    title: "14. Em pé sobre um pé (apoio unipodal)",
    options: [
      "(0) Incapaz de tentar ou necessita de assistência para não cair",
      "(1) Tenta levantar um pé, incapaz de ficar por 3 segundos, mas fica em pé independentemente",
      "(2) Capaz de levantar um pé independentemente e ficar por ≥ 3 segundos",
      "(3) Capaz de levantar um pé independentemente e ficar por 5 a 10 segundos",
      "(4) Capaz de levantar um pé independentemente e ficar por mais de 10 segundos",
    ],
  },
];

interface BergFormProps {
  patientId: string;
  sessionId?: string;
  onSave: (score: number, responses: Record<string, unknown>) => void;
  onCancel: () => void;
}

function getBergInterpretation(score: number): {
  label: string;
  color: string;
} {
  if (score <= 20)
    return {
      label: "Cadeira de rodas necessária",
      color: "bg-red-100 text-red-800",
    };
  if (score <= 40)
    return {
      label: "Ambulação com auxílio",
      color: "bg-orange-100 text-orange-800",
    };
  return { label: "Independente", color: "bg-green-100 text-green-800" };
}

export function BergForm({ onSave, onCancel }: BergFormProps) {
  const [responses, setResponses] = useState<Record<number, number>>({});

  const answeredCount = Object.keys(responses).length;
  const totalItems = BERG_ITEMS.length;
  const totalScore = Object.values(responses).reduce((sum, v) => sum + v, 0);
  const interpretation = answeredCount === totalItems ? getBergInterpretation(totalScore) : null;
  const fallRisk = totalScore < 45 && answeredCount === totalItems;

  const setResponse = (index: number, value: number) => {
    setResponses((prev) => ({ ...prev, [index]: value }));
  };

  const handleSubmit = () => {
    if (answeredCount < totalItems) return;
    const responsePayload: Record<string, unknown> = {};
    BERG_ITEMS.forEach((item, i) => {
      responsePayload[`q${i + 1}`] = responses[i];
      responsePayload[`q${i + 1}_title`] = item.title;
    });
    responsePayload.max_score = 56;
    responsePayload.fall_risk = fallRisk;
    onSave(totalScore, responsePayload);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <PersonStanding className="h-5 w-5 text-teal-500" />
          <CardTitle className="text-lg">Escala de Equilíbrio de Berg (BBS)</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          14 tarefas de equilíbrio. Score máximo: 56 pontos. Escore {"< 45"} indica risco de queda.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-md border bg-blue-50/50 p-3 text-sm text-blue-800">
          <p className="font-medium mb-1">Instrução para o avaliador:</p>
          <p>
            Demonstre e/ou instrua o paciente conforme necessário. Ao pontuar, registre a menor
            categoria que se aplica. Para a maioria dos itens, o paciente deve manter a posição por
            um período específico sem apoio.
          </p>
        </div>

        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {BERG_ITEMS.map((item, index) => (
            <div
              key={index}
              className={`rounded-md border p-3 space-y-2 transition-colors ${
                responses[index] !== undefined ? "bg-teal-50/30 border-teal-200" : "bg-card"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                {responses[index] !== undefined && (
                  <Badge variant="secondary" className="shrink-0 text-teal-700">
                    {responses[index]}/4
                  </Badge>
                )}
              </div>
              <RadioGroup
                value={responses[index]?.toString()}
                onValueChange={(v) => setResponse(index, Number(v))}
                className="space-y-1"
              >
                {item.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-start gap-2">
                    <RadioGroupItem
                      value={optionIndex.toString()}
                      id={`berg-q${index}-o${optionIndex}`}
                      className="mt-0.5 shrink-0"
                    />
                    <Label
                      htmlFor={`berg-q${index}-o${optionIndex}`}
                      className="text-sm font-normal leading-snug cursor-pointer"
                    >
                      {option}
                    </Label>
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
              {answeredCount}/{totalItems} avaliados
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Score Berg:</span>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold tabular-nums">{totalScore}</span>
              <span className="text-muted-foreground">/ {answeredCount * 4}</span>
            </div>
          </div>
          {interpretation && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={interpretation.color}>{interpretation.label}</Badge>
              {fallRisk && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Risco de queda
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
          <p className="font-medium">Interpretação:</p>
          <div className="grid grid-cols-1 gap-0.5 text-muted-foreground text-xs">
            <span>0–20 = Cadeira de rodas necessária</span>
            <span>21–40 = Ambulação com auxílio</span>
            <span>41–56 = Independente</span>
            <span className="text-orange-600 font-medium">{"< 45 = Risco de queda"}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSubmit} disabled={answeredCount < totalItems} className="flex-1">
            {answeredCount < totalItems
              ? `Faltam ${totalItems - answeredCount} avaliações`
              : `Salvar Berg — ${totalScore}/56`}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
