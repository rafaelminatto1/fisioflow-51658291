import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useCardSize } from '@/hooks/useCardSize';
import { cn } from '@/lib/utils';
import { Monitor, Eye, EyeOff, Zap, Type, Palette, CheckCircle2, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { CardSize } from '@/types/agenda';

interface ViewPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  config: {
    cardSize: CardSize;
    heightScale: number;
  };
  tags: string[];
}

const PRESETS: ViewPreset[] = [
  {
    id: 'productive',
    name: 'Alta Produtividade',
    description: 'Maximize a visibilidade com slots compactos e cards pequenos',
    icon: <Zap className="w-5 h-5" />,
    config: { cardSize: 'extra_small', heightScale: 2 },
    tags: ['Compacto', 'Muitos agendamentos']
  },
  {
    id: 'balanced',
    name: 'Equilibrado',
    description: 'Bom equilíbrio entre informações e espaço na tela',
    icon: <Monitor className="w-5 h-5" />,
    config: { cardSize: 'medium', heightScale: 5 },
    tags: ['Padrão', 'Recomendado']
  },
  {
    id: 'comfortable',
    name: 'Confortável',
    description: 'Maior espaço para leitura fácil dos detalhes',
    icon: <Eye className="w-5 h-5" />,
    config: { cardSize: 'large', heightScale: 8 },
    tags: ['Espaçoso', 'Fácil leitura']
  },
  {
    id: 'accessibility',
    name: 'Acessibilidade',
    description: 'Tamanho máximo para melhor visibilidade',
    icon: <Type className="w-5 h-5" />,
    config: { cardSize: 'large', heightScale: 10 },
    tags: ['Alto contraste', 'Texto grande']
  }
];

export function CalendarViewPresets() {
  const { cardSize, setCardSize, heightScale, setHeightScale } = useCardSize();
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null);

  const currentPreset = PRESETS.find(
    p => p.config.cardSize === cardSize && p.config.heightScale === heightScale
  );

  const applyPreset = (preset: ViewPreset) => {
    setCardSize(preset.config.cardSize);
    setHeightScale(preset.config.heightScale);
    setAppliedPreset(preset.id);
    setTimeout(() => setAppliedPreset(null), 2000);
    toast({
      title: 'Preset aplicado',
      description: `${preset.name} - ${preset.description}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Presets Section */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Presets de Visualização</CardTitle>
              <CardDescription>
                Configurações otimizadas para diferentes cenários de uso
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info alert */}
          <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
              Presets configuram automaticamente o tamanho dos cards e a altura dos slots. Use as opções de acessibilidade para personalizar ainda mais.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PRESETS.map((preset) => {
              const isActive = currentPreset?.id === preset.id;
              const wasApplied = appliedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "relative flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left group",
                    "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                    isActive
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg transition-all",
                        isActive || wasApplied ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted group-hover:bg-primary/10"
                      )}>
                        {wasApplied ? <CheckCircle2 className="w-5 h-5" /> : preset.icon}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">{preset.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{preset.description}</p>
                      </div>
                    </div>
                    {isActive && !wasApplied && (
                      <Badge variant="default" className="text-xs">Ativo</Badge>
                    )}
                    {wasApplied && (
                      <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">Aplicado!</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {preset.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Accessibility Section */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Acessibilidade</CardTitle>
              <CardDescription>
                Opções para melhorar a usabilidade e acessibilidade
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* High Contrast */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background rounded-md">
                <EyeOff className="w-4 h-4" />
              </div>
              <div className="text-left">
                <Label htmlFor="high-contrast" className="font-medium cursor-pointer">
                  Alto Contraste
                </Label>
                <p className="text-xs text-muted-foreground">
                  Aumenta o contraste das cores para melhor visibilidade
                </p>
              </div>
            </div>
            <Switch
              id="high-contrast"
              checked={highContrast}
              onCheckedChange={(checked) => {
                setHighContrast(checked);
                document.documentElement.classList.toggle('high-contrast', checked);
                toast({
                  title: checked ? 'Alto contraste ativado' : 'Alto contraste desativado',
                });
              }}
            />
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background rounded-md">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-left">
                <Label htmlFor="reduced-motion" className="font-medium cursor-pointer">
                  Movimento Reduzido
                </Label>
                <p className="text-xs text-muted-foreground">
                  Minimiza animações e transições
                </p>
              </div>
            </div>
            <Switch
              id="reduced-motion"
              checked={reducedMotion}
              onCheckedChange={(checked) => {
                setReducedMotion(checked);
                document.documentElement.classList.toggle('reduce-motion', checked);
                toast({
                  title: checked ? 'Movimento reduzido ativado' : 'Movimento reduzido desativado',
                });
              }}
            />
          </div>

          {/* Large Text */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background rounded-md">
                <Type className="w-4 h-4" />
              </div>
              <div className="text-left">
                <Label htmlFor="large-text" className="font-medium cursor-pointer">
                  Texto Grande
                </Label>
                <p className="text-xs text-muted-foreground">
                  Aumenta o tamanho do texto em toda a agenda
                </p>
              </div>
            </div>
            <Switch
              id="large-text"
              checked={largeText}
              onCheckedChange={(checked) => {
                setLargeText(checked);
                document.documentElement.classList.toggle('large-text', checked);
                toast({
                  title: checked ? 'Texto grande ativado' : 'Texto grande desativado',
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-medium text-sm mb-1">Dica Rápida</p>
            <p className="text-xs text-muted-foreground">
              Os presets configuram automaticamente o tamanho dos cards e a altura dos slots.
              Use as opções de acessibilidade para personalizar ainda mais sua experiência.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
