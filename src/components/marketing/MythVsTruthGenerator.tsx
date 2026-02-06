/**
 * Myth vs Truth Generator Component
 *
 * Create engaging "Mito vs Verdade" carousels for social media
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

  Sparkles,
  Download,
  Lightbulb,
  XCircle,
  CheckCircle2,
  Info,
  Plus,
  Trash2,
  Eye,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MYTH_TEMPLATES = [
  {
    topic: 'Dor nas Costas',
    myth: 'Repouso absoluto é o melhor tratamento',
    truth: 'O movimento controlado acelera a recuperação',
    explanation: 'Estudos mostram que manter-se ativo dentro da dor tolerável melhora a circulação, reduz inflamação e previna fraqueza muscular.',
  },
  {
    topic: 'Postura',
    myth: 'Postura correta é ficar totalmente reto',
    truth: 'A melhor postura é a próxima posição',
    explanation: 'O corpo foi feito para se movimentar. Ficar na mesma posição por muito tempo é prejudicial, independentemente de quão "perfeita" pareça.',
  },
  {
    topic: 'Alongamento',
    myth: 'Alongar antes do exercício previne lesões',
    truth: 'Alongamento estático não previne lesões',
    explanation: 'O aquecimento com movimentos dinâmicos é mais eficaz. Alongamento estático é melhor após o exercício.',
  },
  {
    topic: 'Marcha',
    myth: 'Dor ao andar é normal com o envelhecimento',
    truth: 'Dor ao andar NÃO é normal em nenhuma idade',
    explanation: 'A dor indica um problema que pode ser tratado. Fisioterapia pode melhorar a mobilidade e reduzir a dor ao andar.',
  },
];

interface MythSlide {
  type: 'myth' | 'truth' | 'explanation';
  title: string;
  content: string;
}

interface MythContent {
  id: string;
  topic: string;
  myth: string;
  truth: string;
  explanation: string;
  slides: MythSlide[];
}

export function MythVsTruthGenerator() {
  const [myths, setMyths] = useState<MythContent[]>([]);
  const [currentMyth, setCurrentMyth] = useState<MythContent>({
    id: '',
    topic: '',
    myth: '',
    truth: '',
    explanation: '',
    slides: [],
  });
  const [customBranding, setCustomBranding] = useState({
    showLogo: true,
    clinicName: '',
    showHashtags: true,
  });
  const [previewMode, setPreviewMode] = useState(false);

  const addMyth = (template: typeof MYTH_TEMPLATES[0]) => {
    const newMyth: MythContent = {
      id: Date.now().toString(),
      topic: template.topic,
      myth: template.myth,
      truth: template.truth,
      explanation: template.explanation,
      slides: generateSlides(template),
    };
    setMyths([...myths, newMyth]);
    toast.success('Mito adicionado!');
  };

  const generateSlides = (content: MythContent | typeof MYTH_TEMPLATES[0]): MythSlide[] => {
    return [
      {
        type: 'myth',
        title: `MITO: ${content.myth.substring(0, 50)}${content.myth.length > 50 ? '...' : ''}`,
        content: `"${content.myth}"`,
      },
      {
        type: 'truth',
        title: 'VERDADE',
        content: content.truth,
      },
      {
        type: 'explanation',
        title: 'O QUE A CIÊNCIA DIZ',
        content: content.explanation,
      },
    ];
  };

  const addCustomMyth = () => {
    if (!currentMyth.topic || !currentMyth.myth || !currentMyth.truth) {
      toast.error('Preencha o tópico, o mito e a verdade');
      return;
    }

    const newMyth: MythContent = {
      ...currentMyth,
      id: Date.now().toString(),
      slides: generateSlides(currentMyth),
    };

    setMyths([...myths, newMyth]);
    setCurrentMyth({
      id: '',
      topic: '',
      myth: '',
      truth: '',
      explanation: '',
      slides: [],
    });
    toast.success('Mito personalizado adicionado!');
  };

  const removeMyth = (id: string) => {
    setMyths(myths.filter(m => m.id !== id));
    toast.success('Mito removido');
  };

  const exportAsText = (myth: MythContent) => {
    const text = `
MITO VS VERDADE: ${myth.topic}

❌ MITO
${myth.myth}

✅ VERDADE
${myth.truth}

📚 EXPLICAÇÃO
${myth.explanation}

#Fisioterapia #MitoVsVerdade #Saude #Movimento
    `.trim();

    navigator.clipboard.writeText(text);
    toast.success('Conteúdo copiado para a área de transferência');
  };

  const getSlideIcon = (type: MythSlide['type']) => {
    switch (type) {
      case 'myth':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'truth':
        return <CheckCircle2 className="h-6 w-6 text-emerald-600" />;
      case 'explanation':
        return <Info className="h-6 w-6 text-blue-600" />;
    }
  };

  const getSlideColor = (type: MythSlide['type']) => {
    switch (type) {
      case 'myth':
        return 'bg-gradient-to-br from-red-500 to-orange-500';
      case 'truth':
        return 'bg-gradient-to-br from-emerald-500 to-green-500';
      case 'explanation':
        return 'bg-gradient-to-br from-blue-500 to-indigo-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Gerador de Mito vs Verdade
          </h2>
          <p className="text-muted-foreground">
            Crie carrosséis engajadores para suas redes sociais
          </p>
        </div>
        <Switch
          checked={previewMode}
          onCheckedChange={setPreviewMode}
        />
      </div>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Templates Prontos</CardTitle>
          <CardDescription>Clique para adicionar ao seu carrossel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {MYTH_TEMPLATES.map((template, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors"
                onClick={() => addMyth(template)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Badge className="mb-2">{template.topic}</Badge>
                    <p className="text-sm font-medium text-red-600">
                      ❌ {template.myth}
                    </p>
                    <p className="text-sm font-medium text-emerald-600 mt-1">
                      ✅ {template.truth}
                    </p>
                  </div>
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Myth */}
      <Card>
        <CardHeader>
          <CardTitle>Criar Mito Personalizado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tópico</Label>
            <Input
              value={currentMyth.topic}
              onChange={e => setCurrentMyth({ ...currentMyth, topic: e.target.value })}
              placeholder="Ex: Dor nas Costas, Alongamento..."
            />
          </div>

          <div className="space-y-2">
            <Label>Mito (o que as pessoas pensam)</Label>
            <Textarea
              value={currentMyth.myth}
              onChange={e => setCurrentMyth({ ...currentMyth, myth: e.target.value })}
              rows={2}
              placeholder="Ex: Repouso absoluto é o melhor para dor nas costas"
            />
          </div>

          <div className="space-y-2">
            <Label>Verdade (o que a ciência diz)</Label>
            <Textarea
              value={currentMyth.truth}
              onChange={e => setCurrentMyth({ ...currentMyth, truth: e.target.value })}
              rows={2}
              placeholder="Ex: Movimento controlado acelera a recuperação"
            />
          </div>

          <div className="space-y-2">
            <Label>Explicação Científica</Label>
            <Textarea
              value={currentMyth.explanation}
              onChange={e => setCurrentMyth({ ...currentMyth, explanation: e.target.value })}
              rows={3}
              placeholder="Explique por que o mito é falso e cite evidências..."
            />
          </div>

          <Button onClick={addCustomMyth} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Mito Personalizado
          </Button>
        </CardContent>
      </Card>

      {/* Generated Myths */}
      {myths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Seus Mitos ({myths.length})</CardTitle>
            <CardDescription>Visualize e exporte seus mitos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {myths.map((myth) => (
              <div key={myth.id} className="border rounded-lg overflow-hidden">
                {/* Header */}
                <div className="bg-muted p-3 flex items-center justify-between">
                  <Badge>{myth.topic}</Badge>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportAsText(myth)}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar Texto
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeMyth(myth.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Slides Preview */}
                <div className="grid md:grid-cols-3 gap-1 p-4 bg-gray-100 dark:bg-gray-900">
                  {myth.slides.map((slide, index) => (
                    <div
                      key={index}
                      className={cn(
                        'aspect-square p-4 flex flex-col items-center justify-center text-center text-white',
                        getSlideColor(slide.type)
                      )}
                    >
                      <div className="mb-3">{getSlideIcon(slide.type)}</div>
                      <h4 className="font-bold text-sm mb-2">{slide.title}</h4>
                      <p className="text-xs opacity-90">{slide.content}</p>
                      {index === myth.slides.length - 1 && (
                        <div className="mt-auto pt-4 text-xs opacity-70">
                          <p>@{customBranding.clinicName || 'suaclinica'}</p>
                          <p>#Fisioterapia #MitoVsVerdade</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tips Card */}
      <Card className="border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                Dicas para Carrosséis de Sucesso
              </p>
              <ul className="space-y-1 text-purple-800 dark:text-purple-200">
                <li>• Use mitos que você ouve frequentemente de pacientes</li>
                <li>• Mantenha o texto curto e direto</li>
                <li>• Use cores contrastantes para cada slide</li>
                <li>• Inclua call-to-action no último slide</li>
                <li>• Salve como formato quadrado (1080x1080) para Instagram</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
