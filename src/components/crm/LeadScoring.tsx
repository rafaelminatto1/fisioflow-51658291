import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp, Target, Award, Info, Zap, AlertCircle,
  CheckCircle2, Clock, Phone, Mail, Calendar
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLeadScoring } from './hooks/useLeadScoring';

const TIERS = {
  hot: { label: 'Quente', color: 'bg-red-500', textColor: 'text-red-600', minScore: 70 },
  warm: { label: 'Morno', color: 'bg-yellow-500', textColor: 'text-yellow-600', minScore: 40 },
  cold: { label: 'Frio', color: 'bg-blue-500', textColor: 'text-blue-600', minScore: 0 },
};

interface LeadScoringProps {
  leadId?: string;
  showSettings?: boolean;
}

export function LeadScoring({ _leadId, showSettings = false }: LeadScoringProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'rules' | 'settings'>('overview');

  // Buscar scores calculados
  const { data: scores = [], isLoading } = useQuery({
    queryKey: ['lead-scores', _leadId],
    queryFn: async () => {
      let query = supabase.from('lead_scores').select('*, leads(*)');
      if (_leadId) {
        query = query.eq('lead_id', _leadId);
      }
      const { data, error } = await query.order('total_score', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Buscar regras (unused but kept for future use)
  // const { data: regras = [] } = useQuery({
  //   queryKey: ['lead-scoring-regras'],
  //   queryFn: async () => {
  //     const { data, error } = await supabase
  //       .from('lead_scoring_regras')
  //       .select('*')
  //       .order('points', { ascending: false });
  //     if (error) throw error;
  //     return data;
  //   },
  // });

  const { calculateScores } = useLeadScoring();

  // Estatísticas
  const stats = useMemo(() => {
    if (!scores.length) return null;

    return {
      total: scores.length,
      hot: scores.filter((s: { tier: string }) => s.tier === 'hot').length,
      warm: scores.filter((s: { tier: string }) => s.tier === 'warm').length,
      cold: scores.filter((s: { tier: string }) => s.tier === 'cold').length,
      avgScore: Math.round(scores.reduce((acc: number, s: { total_score: number }) => acc + s.total_score, 0) / scores.length),
    };
  }, [scores]);

  const getTierBadge = (tier: string) => {
    const config = TIERS[tier as keyof typeof TIERS];
    return (
      <Badge className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  if (showSettings) {
    activeTab = 'settings';
  }

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Lead Scoring
          </h2>
          <p className="text-muted-foreground">
            Pontuação automática de leads para priorizar atendimento
          </p>
        </div>
        <Button onClick={() => calculateScores.mutate()}>
          <Zap className="h-4 w-4 mr-2" />
          Recalcular Scores
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'leads' | 'rules' | 'settings')}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="leads">Leads por Score</TabsTrigger>
          <TabsTrigger value="rules">Regras</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-lg">
                        <Award className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.hot}</p>
                        <p className="text-xs text-muted-foreground">Leads Quentes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <Clock className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.warm}</p>
                        <p className="text-xs text-muted-foreground">Leads Mornos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.cold}</p>
                        <p className="text-xs text-muted-foreground">Leads Frios</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.avgScore}</p>
                        <p className="text-xs text-muted-foreground">Score Médio</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Distribuição */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(TIERS).map(([key, config]) => {
                      const count = stats![key as keyof typeof stats];
                      const percentage = stats!.total > 0 ? (count / stats!.total) * 100 : 0;
                      return (
                        <div key={key} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${config.color}`} />
                              <span className="font-medium">{config.label}</span>
                            </div>
                            <span className="text-muted-foreground">{count} leads ({percentage.toFixed(1)}%)</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Leads por Score */}
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : !scores.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum score calculado ainda. Clique em "Recalcular Scores".
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Score Total</TableHead>
                      <TableHead>Engajamento</TableHead>
                      <TableHead>Demográfico</TableHead>
                      <TableHead>Comportamental</TableHead>
                      <TableHead>Classificação</TableHead>
                      <TableHead>Fatores</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(scores as Array<{ id: string; leads?: { name: string } | null; total_score: number; engagement_score: number; demographic_score: number; behavioral_score: number; tier: string; factors?: { length: number } }>).map((score) => (
                      <TableRow key={score.id}>
                        <TableCell className="font-medium">
                          {score.leads?.name || 'Lead'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={score.total_score} className="w-16 h-2" />
                            <span className="font-bold">{score.total_score}</span>
                          </div>
                        </TableCell>
                        <TableCell>{score.engagement_score}</TableCell>
                        <TableCell>{score.demographic_score}</TableCell>
                        <TableCell>{score.behavioral_score}</TableCell>
                        <TableCell>{getTierBadge(score.tier)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="cursor-pointer">
                            +{score.factors?.length || 0} fatores
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regras */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regras de Pontuação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Regras padrão do sistema */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Regras Padrão (Fixas)</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>Possui email</span>
                      </div>
                      <Badge>+10 pontos</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>Possui telefone</span>
                      </div>
                      <Badge className="bg-green-500 text-white">+15 pontos</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span>Veio de indicação</span>
                      </div>
                      <Badge className="bg-green-500 text-white">+20 pontos</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Lead recente (&lt;7 dias)</span>
                      </div>
                      <Badge className="bg-green-500 text-white">+15 pontos</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span>Em fase de avaliação</span>
                      </div>
                      <Badge className="bg-green-500 text-white">+20 pontos</Badge>
                    </div>
                  </div>
                </div>

                {/* Regras customizadas */}
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Regras Customizadas</h4>
                  <p className="text-sm text-muted-foreground">Nenhuma regra customizada criada.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Lead Scoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cálculo Automático</p>
                  <p className="text-sm text-muted-foreground">
                    Recalcular scores automaticamente quando há mudanças nos leads
                  </p>
                </div>
                <Switch defaultChecked={false} />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Limites de Classificação</Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-red-600 font-medium">Quente (Hot)</span>
                      <span>≥ 70 pontos</span>
                    </div>
                    <Progress value={70} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-yellow-600 font-medium">Morno (Warm)</span>
                      <span>40 - 69 pontos</span>
                    </div>
                    <Progress value={55} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-600 font-medium">Frio (Cold)</span>
                      <span>&lt; 40 pontos</span>
                    </div>
                    <Progress value={30} className="h-2" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-400">
                    <p className="font-medium mb-1">Como funciona o Lead Scoring</p>
                    <p className="text-xs">
                      O sistema calcula automaticamente a pontuação de cada lead baseado em fatores demográficos,
                      engajamento e comportamentais. Leads com pontuação mais alta devem ser priorizados.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LeadScoring;
