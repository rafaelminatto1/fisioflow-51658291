import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Package, Loader2, Checklist, Info } from 'lucide-react';
import { useAI } from '@/integrations/firebase/ai';

  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { fisioLogger as logger } from '@/lib/errors/logger';

export const EventPlannerAI: React.FC = () => {
  const { generate } = useAI();
  const [category, setCategory] = useState<string>('corrida');
  const [participants, setParticipants] = useState<string>('100');
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generatePlan = async () => {
    setLoading(true);
    try {
      const prompt = `
        Aja como um gestor de eventos de fisioterapia. 
        Planeje o kit clínico necessário para um evento do tipo: ${category} com aproximadamente ${participants} participantes.
        
        Sugira:
        1. Quantidade de fisioterapeutas/estagiários.
        2. Materiais críticos (fitas, gel, macas, etc).
        3. Dica de ouro para este tipo de evento.
        
        Retorne em Markdown formatado. Responda em Português Brasileiro.
      `;

      const result = await generate(prompt, {
        userId: 'event-manager',
        feature: 'clinical_analysis' as any,
      });

      setPlan(result.content);
    } catch (error) {
      logger.error('Erro ao planejar evento', error, 'EventPlannerAI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-primary text-lg">
          <Sparkles className="h-5 w-5" />
          IA Event Planner
        </CardTitle>
        <CardDescription>Planeje sua equipe e materiais em segundos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo de Evento</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="rounded-xl h-10 bg-background/50">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corrida">🏃 Corrida / Maratona</SelectItem>
                <SelectItem value="workshop">📚 Workshop / Curso</SelectItem>
                <SelectItem value="corporativo">🏢 Atendimento Corporativo</SelectItem>
                <SelectItem value="ativacao">🎯 Ativação de Marca</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Participantes Est.</label>
            <Select value={participants} onValueChange={setParticipants}>
              <SelectTrigger className="rounded-xl h-10 bg-background/50">
                <SelectValue placeholder="Qtd" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">Até 50</SelectItem>
                <SelectItem value="100">50 a 150</SelectItem>
                <SelectItem value="300">150 a 500</SelectItem>
                <SelectItem value="1000">Acima de 500</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={generatePlan} 
          disabled={loading}
          className="w-full rounded-xl font-bold h-11 shadow-sm transition-all"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
          Gerar Planejamento de Kit
        </Button>

        {plan && (
          <div className="mt-4 p-4 rounded-2xl bg-background border border-primary/10 prose prose-sm max-w-none dark:prose-invert">
            <div className="flex items-center gap-2 mb-3 text-primary">
              <Info className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Sugestão da Clinsight IA</span>
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {plan}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
