import React, { useState, useEffect } from 'react';
import { Brain, Plus, Settings, TrendingUp, Database, Zap, Users } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { KnowledgeContributor } from '@/components/ai/KnowledgeContributor';
import { AIAssistant } from '@/components/ai/AIAssistant';
import { AIChat } from '@/components/ai/AIChat';
import { useAI } from '@/hooks/useAI';
import { supabase } from '@/integrations/supabase/client';
import { aiOrchestrator } from '@/services/ai/AIOrchestrator';

export default function SmartAI() {
  const [usageStats, setUsageStats] = useState<{
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    sourceDistribution: Record<string, number>;
    cacheHitRate: number;
  } | null>(null);
  const [knowledgeStats, setKnowledgeStats] = useState<{
    totalEntries: number;
    byType: Record<string, number>;
    averageConfidence: number;
  } | null>(null);
  const [providerStats, setProviderStats] = useState<{
    provider: string;
    account: string;
    isActive: boolean;
    usage: number;
    limit: number;
    utilizationRate: number;
    lastUsed?: string;
  }[]>([]);
  const [showContributor, setShowContributor] = useState(false);
  const { isLoading } = useAI();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Carregar estatísticas de uso
      const usage = await aiOrchestrator.getUsageStats();
      setUsageStats(usage);

      // Carregar estatísticas da base de conhecimento
      const { data: knowledgeData } = await supabase
        .from('knowledge_base')
        .select('type, usage_count, confidence_score');
      
      if (knowledgeData) {
        const stats = {
          totalEntries: knowledgeData.length,
          byType: {} as Record<string, number>,
          averageConfidence: 0,
          mostUsed: 0
        };

        knowledgeData.forEach(entry => {
          stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
        });

        const totalConfidence = knowledgeData.reduce((sum, entry) => sum + entry.confidence_score, 0);
        stats.averageConfidence = knowledgeData.length > 0 ? totalConfidence / knowledgeData.length : 0;
        
        const maxUsage = Math.max(...knowledgeData.map(e => e.usage_count));
        stats.mostUsed = maxUsage;

        setKnowledgeStats(stats);
      }

      // Carregar estatísticas dos provedores (simuladas para demo)
      setProviderStats([
        {
          provider: 'chatgpt',
          account: 'ChatGPT Plus #1',
          isActive: true,
          usage: 25,
          limit: 50,
          utilizationRate: 50,
          lastUsed: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        },
        {
          provider: 'claude',
          account: 'Claude Pro #1',
          isActive: true,
          usage: 18,
          limit: 50,
          utilizationRate: 36,
          lastUsed: new Date(Date.now() - 1000 * 60 * 60).toISOString()
        },
        {
          provider: 'gemini',
          account: 'Gemini Pro #1',
          isActive: false,
          usage: 0,
          limit: 50,
          utilizationRate: 0,
          lastUsed: null
        }
      ]);

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'chatgpt': return '🤖';
      case 'claude': return '🧠';
      case 'gemini': return '💎';
      case 'perplexity': return '🔍';
      default: return '🤖';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'knowledge_base': return 'bg-green-500';
      case 'cache': return 'bg-blue-500';
      case 'provider': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              Sistema de IA Econômica
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerenciamento inteligente de IA para fisioterapia com custo zero
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowContributor(true)}
              variant="outline"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Contribuir
            </Button>
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </Button>
          </div>
        </div>

        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Consultas Total</p>
                  <p className="text-2xl font-bold">{usageStats?.totalQueries || 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cache Hit Rate</p>
                  <p className="text-2xl font-bold">{Math.round(usageStats?.cacheHitRate || 0)}%</p>
                </div>
                <Zap className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Base Conhecimento</p>
                  <p className="text-2xl font-bold">{knowledgeStats?.totalEntries || 2}</p>
                </div>
                <Database className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tempo Médio</p>
                  <p className="text-2xl font-bold">{Math.round(usageStats?.averageResponseTime || 1200)}ms</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="chat">Chat IA</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="providers">Provedores</TabsTrigger>
            <TabsTrigger value="knowledge">Conhecimento</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <AIChat />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Distribuição por Fonte */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Fonte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {usageStats?.sourceDistribution && Object.entries(usageStats.sourceDistribution).map(([source, count]: [string, number]) => (
                    <div key={source} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getSourceColor(source)}`} />
                        <span className="capitalize">{source.replace('_', ' ')}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Sistema de Cache */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance do Cache</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Taxa de Acerto</span>
                      <span>{Math.round(usageStats?.cacheHitRate || 0)}%</span>
                    </div>
                    <Progress value={usageStats?.cacheHitRate || 0} className="w-full" />
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Cache inteligente reduzindo tempo de resposta em {Math.round((usageStats?.cacheHitRate || 0) * 0.8)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => setShowContributor(true)}
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                  >
                    <Plus className="h-6 w-6" />
                    Adicionar Conhecimento
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex flex-col gap-2">
                    <Settings className="h-6 w-6" />
                    Configurar Provedores
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex flex-col gap-2">
                    <Database className="h-6 w-6" />
                    Limpar Cache
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="providers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contas Premium Ativas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Rotação inteligente entre contas para máxima eficiência
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {providerStats.map((provider, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getProviderIcon(provider.provider)}</span>
                          <div>
                            <h3 className="font-medium">{provider.account}</h3>
                            <p className="text-sm text-muted-foreground capitalize">
                              {provider.provider} • {provider.isActive ? 'Ativo' : 'Inativo'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={provider.isActive ? 'default' : 'secondary'}>
                          {provider.isActive ? 'Online' : 'Offline'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Uso Diário</span>
                          <span>{provider.usage}/{provider.limit}</span>
                        </div>
                        <Progress value={provider.utilizationRate} className="w-full" />
                        
                        {provider.lastUsed && (
                          <p className="text-xs text-muted-foreground">
                            Último uso: {new Date(provider.lastUsed).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Conta Premium
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Base de Conhecimento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{knowledgeStats?.totalEntries || 2}</div>
                    <div className="text-sm text-muted-foreground">Entradas de conhecimento</div>
                  </div>
                  
                  <div className="space-y-2">
                    {knowledgeStats?.byType && Object.entries(knowledgeStats.byType).map(([type, count]: [string, number]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Qualidade do Conteúdo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Confiança Média</span>
                      <span>{Math.round((knowledgeStats?.averageConfidence || 0.8) * 100)}%</span>
                    </div>
                    <Progress value={(knowledgeStats?.averageConfidence || 0.8) * 100} className="w-full" />
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Base de conhecimento com alta confiabilidade científica
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                    <p className="text-green-800 text-sm">
                      💡 <strong>Dica:</strong> Contribua com casos clínicos para melhorar a precisão da IA
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Contribuir com Conhecimento</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Compartilhe protocolos, técnicas e casos clínicos
                </p>
              </CardHeader>
              <CardContent>
                {showContributor ? (
                  <KnowledgeContributor 
                    onSuccess={() => {
                      setShowContributor(false);
                      loadStats();
                    }} 
                  />
                ) : (
                  <Button onClick={() => setShowContributor(true)} className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Novo Conhecimento
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Analytics de Uso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{usageStats?.totalQueries || 0}</div>
                    <div className="text-sm text-muted-foreground">Consultas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{Math.round(usageStats?.averageResponseTime || 1200)}ms</div>
                    <div className="text-sm text-muted-foreground">Tempo Médio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{Math.round(usageStats?.averageRating || 4.2)}</div>
                    <div className="text-sm text-muted-foreground">Avaliação</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">R$ 0</div>
                    <div className="text-sm text-muted-foreground">Custo APIs</div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-blue-50 border rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">💰 Economia Estimada</h3>
                  <p className="text-sm text-green-700">
                    Com {usageStats?.totalQueries || 0} consultas usando APIs pagas, você economizou aproximadamente 
                    <strong> R$ {((usageStats?.totalQueries || 0) * 0.15).toFixed(2)}</strong> este mês.
                  </p>
                </div>

                <div className="mt-6">
                  <h3 className="font-medium mb-3">Estratégia de IA Híbrida</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm">1. Base de Conhecimento Interna</span>
                      <Badge variant="outline">Primeira prioridade</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm">2. Cache Semântico Inteligente</span>
                      <Badge variant="outline">Respostas rápidas</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span className="text-sm">3. Contas Premium (Rotação)</span>
                      <Badge variant="outline">Custo zero</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-gray-500" />
                      <span className="text-sm">4. Fallback Baseado em Diretrizes</span>
                      <Badge variant="outline">Sempre funciona</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}