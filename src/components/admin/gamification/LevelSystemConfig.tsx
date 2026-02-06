import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {

  Trophy, TrendingUp, Plus, Trash2, Save, RefreshCw,
  Settings, Info, Sparkles
} from 'lucide-react';
import { useGamificationAdmin, calculateLevelCurve } from '@/hooks/useGamificationAdmin';
import { ProgressionType, LevelConfig } from '@/types/gamification';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

/**
 * LevelSystemConfig Component
 * Configure the progression system with custom level titles and rewards
 */
export const LevelSystemConfig: React.FC = () => {
  const { levelSettings, levelSettingsLoading, updateLevelSettings } = useGamificationAdmin();

  const [progressionType, setProgressionType] = useState<ProgressionType>('linear');
  const [baseXp, setBaseXp] = useState(1000);
  const [multiplier, setMultiplier] = useState(1.5);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with server data
  useEffect(() => {
    if (levelSettings) {
      setProgressionType(levelSettings.progressionType);
      setBaseXp(levelSettings.baseXp);
      setMultiplier(levelSettings.multiplier);
      setHasChanges(false);
    }
  }, [levelSettings]);

  // Calculate level curve for preview
  const levelCurve = calculateLevelCurve(progressionType, baseXp, multiplier, 20);

  const handleSave = () => {
    updateLevelSettings.mutate({
      progressionType,
      baseXp,
      multiplier,
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    setProgressionType('linear');
    setBaseXp(1000);
    setMultiplier(1.5);
    setHasChanges(true);
  };

  const getProgressionTypeLabel = (type: ProgressionType) => {
    switch (type) {
      case 'linear': return 'Linear';
      case 'exponential': return 'Exponencial';
      case 'custom': return 'Personalizado';
      default: return type;
    }
  };

  const getProgressionTypeDescription = (type: ProgressionType) => {
    switch (type) {
      case 'linear':
        return 'Cada nível requer a mesma quantidade adicional de XP';
      case 'exponential':
        return 'A dificuldade aumenta progressivamente a cada nível';
      case 'custom':
        return 'Configure níveis individualmente';
      default:
        return '';
    }
  };

  if (levelSettingsLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="card" rows={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progression Type & Base Settings */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Progression Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tipo de Progressão
            </CardTitle>
            <CardDescription>
              Escolha como os níveis serão calculados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={progressionType}
              onValueChange={(value) => {
                setProgressionType(value as ProgressionType);
                setHasChanges(true);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="exponential">Exponencial</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            <p className="text-sm text-muted-foreground">
              {getProgressionTypeDescription(progressionType)}
            </p>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Info className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {progressionType === 'exponential'
                  ? `Multiplicador atual: ${multiplier}x`
                  : `XP base por nível: ${baseXp.toLocaleString()} XP`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Base Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Configurações de XP
            </CardTitle>
            <CardDescription>
              Ajuste os valores base do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {progressionType === 'linear' && (
              <div className="space-y-2">
                <Label htmlFor="baseXp">XP Base por Nível</Label>
                <Input
                  id="baseXp"
                  type="number"
                  min={100}
                  max={100000}
                  step={100}
                  value={baseXp}
                  onChange={(e) => {
                    setBaseXp(Number(e.target.value));
                    setHasChanges(true);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Quantidade de XP necessária para subir do nível 1 para o 2
                </p>
              </div>
            )}

            {progressionType === 'exponential' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="baseXpExp">XP Base (Nível 1)</Label>
                  <Input
                    id="baseXpExp"
                    type="number"
                    min={100}
                    max={100000}
                    step={100}
                    value={baseXp}
                    onChange={(e) => {
                      setBaseXp(Number(e.target.value));
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="multiplier">
                    Multiplicador: {multiplier}x
                  </Label>
                  <Slider
                    id="multiplier"
                    min={1.1}
                    max={3}
                    step={0.1}
                    value={[multiplier]}
                    onValueChange={([value]) => {
                      setMultiplier(value);
                      setHasChanges(true);
                    }}
                    className="py-4"
                  />
                  <p className="text-xs text-muted-foreground">
                    Controla a curva de dificuldade
                  </p>
                </div>
              </>
            )}

            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-xs text-primary">
                Alterações afetam novos ganhos de XP imediatamente
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Preview da Curva de Progressão
          </CardTitle>
          <CardDescription>
            Visualize como os níveis serão distribuídos (primeiros 20 níveis)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {levelCurve.slice(0, 10).map((level) => {
              const previousLevel = levelCurve[level.level - 2];
              const xpDifference = previousLevel
                ? level.xpRequired - previousLevel.xpRequired
                : level.xpRequired;

              const progressPercentage = level.level <= 1
                ? 100
                : ((level.xpRequired - (previousLevel?.xpRequired || 0)) / level.xpRequired) * 100;

              return (
                <div key={level.level} className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 text-white font-bold text-sm">
                    {level.level}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Nível {level.level}</span>
                      <Badge variant="outline" className="text-xs">
                        +{xpDifference.toLocaleString()} XP
                      </Badge>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold">{level.xpRequired.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">XP total</p>
                  </div>
                </div>
              );
            })}
          </div>

          {levelCurve.length > 10 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground text-center">
                Mostrando primeiros 10 de {levelCurve.length} níveis
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges || updateLevelSettings.isPending}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Resetar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateLevelSettings.isPending}
        >
          {updateLevelSettings.isPending && (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          )}
          <Save className="mr-2 h-4 w-4" />
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
};

export default LevelSystemConfig;
