import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

import { Plus, Minus, ClipboardList, Target } from 'lucide-react';
import { FunctionalTest } from '@/hooks/useSOAPRecords';

interface FunctionalAssessmentProps {
  tests: FunctionalTest[];
  onChange: (tests: FunctionalTest[]) => void;
  className?: string;
}

// Common functional assessment scales used in physiotherapy
const assessmentScales = {
  oswestry: {
    name: 'Oswestry Disability Index',
    category: 'functional' as const,
    description: 'Avaliação de incapacidade lombar',
    maxScore: 50,
    sections: [
      'Intensidade da dor',
      'Cuidados pessoais',
      'Levantar objetos',
      'Caminhar',
      'Sentar',
      'Ficar em pé',
      'Dormir',
      'Vida sexual',
      'Vida social',
      'Viajar'
    ],
    interpretation: {
      'minimal': { range: [0, 20], label: 'Incapacidade Mínima', color: 'bg-green-100 text-green-800' },
      'moderate': { range: [21, 40], label: 'Incapacidade Moderada', color: 'bg-yellow-100 text-yellow-800' },
      'severe': { range: [41, 60], label: 'Incapacidade Severa', color: 'bg-orange-100 text-orange-800' },
      'crippling': { range: [61, 80], label: 'Incapacidade Extrema', color: 'bg-red-100 text-red-800' },
      'bedbound': { range: [81, 100], label: 'Acamado', color: 'bg-red-200 text-red-900' }
    }
  },
  ndi: {
    name: 'Neck Disability Index',
    category: 'functional' as const,
    description: 'Avaliação de incapacidade cervical',
    maxScore: 50,
    sections: [
      'Intensidade da dor',
      'Cuidados pessoais',
      'Levantar objetos',
      'Leitura',
      'Dores de cabeça',
      'Concentração',
      'Trabalho',
      'Dirigir',
      'Dormir',
      'Recreação'
    ],
    interpretation: {
      'minimal': { range: [0, 8], label: 'Sem incapacidade', color: 'bg-green-100 text-green-800' },
      'mild': { range: [9, 14], label: 'Incapacidade leve', color: 'bg-yellow-100 text-yellow-800' },
      'moderate': { range: [15, 24], label: 'Incapacidade moderada', color: 'bg-orange-100 text-orange-800' },
      'severe': { range: [25, 34], label: 'Incapacidade severa', color: 'bg-red-100 text-red-800' },
      'complete': { range: [35, 50], label: 'Incapacidade completa', color: 'bg-red-200 text-red-900' }
    }
  },
  dash: {
    name: 'DASH - Disabilities of Arm, Shoulder and Hand',
    category: 'functional' as const,
    description: 'Avaliação funcional do membro superior',
    maxScore: 100,
    sections: [
      'Atividades físicas (8 itens)',
      'Sintomas (6 itens)',
      'Função social (2 itens)',
      'Trabalho (4 itens)',
      'Sono (1 item)',
      'Confiança (1 item)',
      'Módulo trabalho (4 itens)',
      'Módulo esporte/música (4 itens)'
    ],
    interpretation: {
      'minimal': { range: [0, 20], label: 'Incapacidade Mínima', color: 'bg-green-100 text-green-800' },
      'mild': { range: [21, 40], label: 'Incapacidade Leve', color: 'bg-yellow-100 text-yellow-800' },
      'moderate': { range: [41, 60], label: 'Incapacidade Moderada', color: 'bg-orange-100 text-orange-800' },
      'severe': { range: [61, 80], label: 'Incapacidade Severa', color: 'bg-red-100 text-red-800' },
      'extreme': { range: [81, 100], label: 'Incapacidade Extrema', color: 'bg-red-200 text-red-900' }
    }
  },
  berg: {
    name: 'Berg Balance Scale',
    category: 'balance' as const,
    description: 'Avaliação do equilíbrio funcional',
    maxScore: 56,
    sections: [
      'Sentado para em pé',
      'Em pé sem apoio',
      'Sentado sem apoio',
      'Em pé para sentado',
      'Transferências',
      'Em pé com olhos fechados',
      'Em pé com pés juntos',
      'Alcançar à frente',
      'Pegar objeto do chão',
      'Olhar para trás',
      'Girar 360°',
      'Tocar degrau',
      'Em pé com um pé à frente',
      'Em pé sobre um pé'
    ],
    interpretation: {
      'high': { range: [41, 56], label: 'Baixo risco de quedas', color: 'bg-green-100 text-green-800' },
      'moderate': { range: [21, 40], label: 'Risco moderado de quedas', color: 'bg-yellow-100 text-yellow-800' },
      'high_risk': { range: [0, 20], label: 'Alto risco de quedas', color: 'bg-red-100 text-red-800' }
    }
  },
  barthel: {
    name: 'Índice de Barthel',
    category: 'functional' as const,
    description: 'Avaliação de atividades de vida diária',
    maxScore: 100,
    sections: [
      'Alimentação',
      'Banho',
      'Higiene pessoal',
      'Vestir-se',
      'Controle intestinal',
      'Controle urinário',
      'Uso do banheiro',
      'Transferência cama-cadeira',
      'Mobilidade',
      'Subir escadas'
    ],
    interpretation: {
      'independent': { range: [90, 100], label: 'Independente', color: 'bg-green-100 text-green-800' },
      'slight': { range: [75, 89], label: 'Dependência leve', color: 'bg-yellow-100 text-yellow-800' },
      'moderate': { range: [50, 74], label: 'Dependência moderada', color: 'bg-orange-100 text-orange-800' },
      'severe': { range: [25, 49], label: 'Dependência severa', color: 'bg-red-100 text-red-800' },
      'total': { range: [0, 24], label: 'Dependência total', color: 'bg-red-200 text-red-900' }
    }
  }
};

export function FunctionalAssessment({ tests, onChange, className }: FunctionalAssessmentProps) {
  const [selectedScale, setSelectedScale] = useState<string>('');

  const addTest = () => {
    if (!selectedScale) return;

    const scale = assessmentScales[selectedScale as keyof typeof assessmentScales];
    if (!scale) return;

    const newTest: FunctionalTest = {
      test_name: scale.name,
      category: scale.category,
      score: 0,
      max_score: scale.maxScore,
      interpretation: '',
      notes: '',
      date_performed: new Date().toISOString().split('T')[0]
    };

    onChange([...tests, newTest]);
    setSelectedScale('');
  };

  const updateTest = (index: number, updates: Partial<FunctionalTest>) => {
    const updatedTests = tests.map((test, i) => 
      i === index ? { ...test, ...updates } : test
    );
    onChange(updatedTests);
  };

  const removeTest = (index: number) => {
    onChange(tests.filter((_, i) => i !== index));
  };

  const getInterpretation = (testName: string, score: number) => {
    const scale = Object.values(assessmentScales).find(s => s.name === testName);
    if (!scale) return { label: 'N/A', color: 'bg-gray-100 text-gray-800' };

    const percentage = (score / scale.maxScore) * 100;
    
    for (const [, interp] of Object.entries(scale.interpretation)) {
      const [min, max] = interp.range;
      const minPercent = (min / scale.maxScore) * 100;
      const maxPercent = (max / scale.maxScore) * 100;
      
      if (percentage >= minPercent && percentage <= maxPercent) {
        return interp;
      }
    }

    return { label: 'N/A', color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Escalas de Avaliação Funcional
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Aplicação de escalas padronizadas para avaliação funcional
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Test */}
          <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <label className="text-sm font-medium">Escala de Avaliação</label>
              <Select value={selectedScale} onValueChange={setSelectedScale}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma escala" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(assessmentScales).map(([key, scale]) => (
                    <SelectItem key={key} value={key}>
                      <div>
                        <div className="font-medium">{scale.name}</div>
                        <div className="text-xs text-muted-foreground">{scale.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={addTest} disabled={!selectedScale}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            {tests.map((test, index) => {
              const interpretation = getInterpretation(test.test_name, test.score);
              const percentage = (test.score / test.max_score) * 100;
              const scale = Object.values(assessmentScales).find(s => s.name === test.test_name);

              return (
                <Card key={index} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">{test.test_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {scale?.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTest(index)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Data da Avaliação</label>
                        <input
                          type="date"
                          value={test.date_performed}
                          onChange={(e) => updateTest(index, { date_performed: e.target.value })}
                          className="w-full p-2 border rounded-md text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Pontuação (0-{test.max_score})
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={test.score}
                            onChange={(e) => {
                              const score = Math.min(test.max_score, Math.max(0, parseInt(e.target.value) || 0));
                              updateTest(index, { score });
                            }}
                            min="0"
                            max={test.max_score}
                            className="flex-1 p-2 border rounded-md text-sm"
                          />
                          <span className="text-sm text-muted-foreground">
                            /{test.max_score}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Interpretação</label>
                        <div className="pt-2">
                          <Badge className={interpretation.color}>
                            {interpretation.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Porcentagem</span>
                        <span className="text-sm text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>

                    {/* Scale Sections */}
                    {scale && (
                      <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                        <h5 className="text-sm font-medium mb-2">Seções avaliadas:</h5>
                        <div className="flex flex-wrap gap-1">
                          {scale.sections.map((section, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {section}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Observações e Interpretação Clínica
                      </label>
                      <Textarea
                        value={test.notes}
                        onChange={(e) => updateTest(index, { notes: e.target.value })}
                        placeholder="Observações específicas sobre o desempenho, limitações identificadas, correlação com quadro clínico..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {tests.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum teste funcional aplicado</p>
                <p className="text-sm">Adicione escalas para avaliar funcionalidade</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}