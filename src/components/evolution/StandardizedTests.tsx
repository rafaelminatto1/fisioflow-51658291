import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/web/ui/radio-group';
import { Label } from '@/components/shared/ui/label';
import { Badge } from '@/components/shared/ui/badge';
import { Progress } from '@/components/shared/ui/progress';
import { FileText, TrendingUp, History, Award } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useStandardizedTests, useSaveStandardizedTest } from '@/hooks/useStandardizedTests';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/web/ui/scroll-area';

interface Test {
  id: string;
  name: string;
  description: string;
  category: 'coluna' | 'joelho' | 'ombro';
  questions: TestQuestion[];
}

interface TestQuestion {
  id: string;
  text: string;
  options: TestOption[];
}

interface TestOption {
  value: number;
  label: string;
}

// Oswestry Disability Index (Coluna Lombar)
const oswestryTest: Test = {
  id: 'oswestry',
  name: 'Oswestry Disability Index',
  description: 'Avaliação de incapacidade por dor lombar',
  category: 'coluna',
  questions: [
    {
      id: 'q1',
      text: 'Intensidade da Dor',
      options: [
        { value: 0, label: 'Sem dor no momento' },
        { value: 1, label: 'Dor leve no momento' },
        { value: 2, label: 'Dor moderada no momento' },
        { value: 3, label: 'Dor forte no momento' },
        { value: 4, label: 'Dor muito forte no momento' },
        { value: 5, label: 'Dor extrema no momento' }
      ]
    },
    {
      id: 'q2',
      text: 'Cuidados Pessoais',
      options: [
        { value: 0, label: 'Posso me cuidar normalmente sem causar dor' },
        { value: 1, label: 'Posso me cuidar normalmente mas causa dor extra' },
        { value: 2, label: 'É doloroso me cuidar e sou lento e cuidadoso' },
        { value: 3, label: 'Preciso de alguma ajuda mas consigo fazer a maior parte' },
        { value: 4, label: 'Preciso de ajuda todos os dias' },
        { value: 5, label: 'Não consigo me vestir, me lavo com dificuldade e fico na cama' }
      ]
    },
    {
      id: 'q3',
      text: 'Levantar Objetos',
      options: [
        { value: 0, label: 'Posso levantar objetos pesados sem dor extra' },
        { value: 1, label: 'Posso levantar objetos pesados mas causa dor extra' },
        { value: 2, label: 'A dor me impede de levantar objetos pesados do chão' },
        { value: 3, label: 'A dor me impede de levantar objetos pesados mas consigo com objetos leves' },
        { value: 4, label: 'Só consigo levantar objetos muito leves' },
        { value: 5, label: 'Não consigo levantar ou carregar nada' }
      ]
    },
    {
      id: 'q4',
      text: 'Caminhar',
      options: [
        { value: 0, label: 'A dor não me impede de caminhar qualquer distância' },
        { value: 1, label: 'A dor me impede de caminhar mais de 1,5 km' },
        { value: 2, label: 'A dor me impede de caminhar mais de 500 metros' },
        { value: 3, label: 'A dor me impede de caminhar mais de 250 metros' },
        { value: 4, label: 'Só posso andar usando bengala ou muletas' },
        { value: 5, label: 'Fico na cama a maior parte do tempo e preciso me arrastar para ir ao banheiro' }
      ]
    },
    {
      id: 'q5',
      text: 'Sentar',
      options: [
        { value: 0, label: 'Posso sentar em qualquer cadeira pelo tempo que quiser' },
        { value: 1, label: 'Posso sentar em minha cadeira favorita pelo tempo que quiser' },
        { value: 2, label: 'A dor me impede de sentar por mais de 1 hora' },
        { value: 3, label: 'A dor me impede de sentar por mais de 30 minutos' },
        { value: 4, label: 'A dor me impede de sentar por mais de 10 minutos' },
        { value: 5, label: 'A dor me impede de sentar' }
      ]
    }
  ]
};

// Lysholm Score (Joelho)
const lysholmTest: Test = {
  id: 'lysholm',
  name: 'Lysholm Knee Score',
  description: 'Avaliação funcional do joelho',
  category: 'joelho',
  questions: [
    {
      id: 'q1',
      text: 'Mancar',
      options: [
        { value: 5, label: 'Não' },
        { value: 3, label: 'Leve ou periódico' },
        { value: 0, label: 'Severo e constante' }
      ]
    },
    {
      id: 'q2',
      text: 'Apoio',
      options: [
        { value: 5, label: 'Nenhum' },
        { value: 3, label: 'Bengala ou muleta' },
        { value: 0, label: 'Impossível apoiar peso' }
      ]
    },
    {
      id: 'q3',
      text: 'Travamento',
      options: [
        { value: 15, label: 'Sem travamento e sem sensação de travamento' },
        { value: 10, label: 'Sensação de travamento, mas sem travamento' },
        { value: 6, label: 'Travamento ocasional' },
        { value: 2, label: 'Travamento frequente' },
        { value: 0, label: 'Joelho travado no exame' }
      ]
    },
    {
      id: 'q4',
      text: 'Instabilidade',
      options: [
        { value: 25, label: 'Nunca' },
        { value: 20, label: 'Raramente durante exercícios ou esforços' },
        { value: 15, label: 'Frequentemente durante exercícios ou esforços' },
        { value: 10, label: 'Ocasionalmente em atividades diárias' },
        { value: 5, label: 'Frequentemente em atividades diárias' },
        { value: 0, label: 'Em cada passo' }
      ]
    },
    {
      id: 'q5',
      text: 'Dor',
      options: [
        { value: 25, label: 'Nenhuma' },
        { value: 20, label: 'Inconstante e leve durante exercícios severos' },
        { value: 15, label: 'Marcada durante exercícios severos' },
        { value: 10, label: 'Marcada ao caminhar mais de 2 km' },
        { value: 5, label: 'Marcada ao caminhar menos de 2 km' },
        { value: 0, label: 'Constante' }
      ]
    }
  ]
};

interface StandardizedTestsProps {
  patientId: string;
  onSave?: (test: string, score: number) => void;
}

export function StandardizedTests({ patientId, onSave }: StandardizedTestsProps) {
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showHistory, setShowHistory] = useState(false);

  const tests = [oswestryTest, lysholmTest];
  const { data: testHistory = [] } = useStandardizedTests(patientId);
  const saveTest = useSaveStandardizedTest();

  const calculateScore = () => {
    if (!selectedTest) return 0;
    
    const total = Object.values(answers).reduce((sum, val) => sum + val, 0);
    
    if (selectedTest.id === 'oswestry') {
      // Oswestry: 0-100% (maior = pior)
      const maxScore = selectedTest.questions.length * 5;
      return Math.round((total / maxScore) * 100);
    } else if (selectedTest.id === 'lysholm') {
      // Lysholm: 0-100 pontos (maior = melhor)
      return total;
    }
    
    return 0;
  };

  const getScoreInterpretation = (score: number, testId: string) => {
    if (testId === 'oswestry') {
      if (score <= 20) return { text: 'Incapacidade Mínima', color: 'success' };
      if (score <= 40) return { text: 'Incapacidade Moderada', color: 'warning' };
      if (score <= 60) return { text: 'Incapacidade Severa', color: 'destructive' };
      return { text: 'Incapacidade Extrema', color: 'destructive' };
    } else if (testId === 'lysholm') {
      if (score >= 95) return { text: 'Excelente', color: 'success' };
      if (score >= 84) return { text: 'Bom', color: 'success' };
      if (score >= 65) return { text: 'Regular', color: 'warning' };
      return { text: 'Ruim', color: 'destructive' };
    }
    return { text: '', color: 'default' };
  };

  const handleSubmit = async () => {
    if (!selectedTest || Object.keys(answers).length !== selectedTest.questions.length) {
      toast({
        title: 'Atenção',
        description: 'Por favor, responda todas as questões.',
        variant: 'destructive'
      });
      return;
    }
    
    const score = calculateScore();
    const interpretation = getScoreInterpretation(score, selectedTest.id);

    await saveTest.mutateAsync({
      patient_id: patientId,
      test_type: selectedTest.id as 'oswestry' | 'lysholm' | 'dash',
      test_name: selectedTest.name,
      score,
      max_score: selectedTest.id === 'oswestry' ? 100 : 100,
      interpretation: interpretation.text,
      answers,
    });
    
    onSave?.(selectedTest.name, score);
    setAnswers({});
    setSelectedTest(null);
  };

  const currentScore = calculateScore();
  const interpretation = selectedTest ? getScoreInterpretation(currentScore, selectedTest.id) : null;
  const progress = selectedTest ? (Object.keys(answers).length / selectedTest.questions.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Histórico de testes */}
      {testHistory.length > 0 && !selectedTest && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Histórico de Testes</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? 'Ocultar' : 'Ver Todos'}
              </Button>
            </div>
          </CardHeader>
          {showHistory && (
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {testHistory.map((test) => (
                    <Card key={test.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="h-4 w-4 text-primary" />
                            <h4 className="font-semibold">{test.test_name}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Pontuação: <span className="font-bold text-foreground">{test.score}</span>
                            {test.max_score && ` / ${test.max_score}`}
                          </p>
                          {test.interpretation && (
                            <Badge variant="outline" className="text-xs">
                              {test.interpretation}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {format(new Date(test.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          )}
        </Card>
      )}

      {!selectedTest ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tests.map((test) => (
            <Card 
              key={test.id}
              className="hover:shadow-md transition-all cursor-pointer border-border/50"
              onClick={() => setSelectedTest(test)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{test.name}</CardTitle>
                    <CardDescription className="mt-2">{test.description}</CardDescription>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {test.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{test.questions.length} questões</span>
                </div>
                <Button className="w-full mt-4" variant="outline">
                  Iniciar Teste
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedTest.name}</CardTitle>
                  <CardDescription className="mt-2">{selectedTest.description}</CardDescription>
                </div>
                <Button variant="ghost" onClick={() => { setSelectedTest(null); setAnswers({}); }}>
                  Voltar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{Object.keys(answers).length}/{selectedTest.questions.length}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {Object.keys(answers).length === selectedTest.questions.length && interpretation && (
                <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Pontuação: {currentScore}</p>
                        <p className="text-xs text-muted-foreground mt-1">{interpretation.text}</p>
                      </div>
                    </div>
                    <Badge variant={interpretation.color as 'default' | 'secondary' | 'outline' | 'destructive'}>{interpretation.text}</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {selectedTest.questions.map((question, index) => (
              <Card key={question.id} className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">
                    {index + 1}. {question.text}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={answers[question.id]?.toString()}
                    onValueChange={(value) => setAnswers({ ...answers, [question.id]: Number(value) })}
                  >
                    <div className="space-y-3">
                      {question.options.map((option) => (
                        <div key={option.value} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value={option.value.toString()} id={`${question.id}-${option.value}`} className="mt-1" />
                          <Label htmlFor={`${question.id}-${option.value}`} className="flex-1 cursor-pointer text-sm leading-relaxed">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setSelectedTest(null); setAnswers({}); }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={Object.keys(answers).length !== selectedTest.questions.length || saveTest.isPending}
              className="gap-2"
            >
              {saveTest.isPending ? 'Salvando...' : 'Salvar Teste'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}