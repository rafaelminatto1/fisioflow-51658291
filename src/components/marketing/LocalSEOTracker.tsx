/**
 * Local SEO Tracker Component
 *
 * Monitor Google Business Profile rankings and local SEO metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {

  Search,
  TrendingUp,
  TrendingDown,
  MapPin,
  Star,
  Eye,
  BarChart3,
  Clock,
  CheckCircle2,
  Target,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface KeywordRanking {
  keyword: string;
  rank: number;
  previousRank: number;
  change: number;
  volume: number;
  difficulty: number;
}

interface GoogleBusinessMetrics {
  profileViews: number;
  phoneCalls: number;
  directionRequests: number;
  websiteClicks: number;
  reviewsCount: number;
  averageRating: number;
  photosCount: number;
}

const _KEYWORD_CATEGORIES = [
  { name: 'Primárias', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { name: 'Secundárias', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { name: 'Long-tail', color: 'bg-green-100 text-green-700 border-green-200' },
];

export function LocalSEOTracker() {
  const [rankings, setRankings] = useState<KeywordRanking[]>([]);
  const [metrics, setMetrics] = useState<GoogleBusinessMetrics>({
    profileViews: 0,
    phoneCalls: 0,
    directionRequests: 0,
    websiteClicks: 0,
    reviewsCount: 0,
    averageRating: 0,
    photosCount: 0,
  });
  const [_businessName, _setBusinessName] = useState('');
  const [trackingKeyword, setTrackingKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadMockData();
  }, []);

  const loadMockData = () => {
    // Mock data - in production, this would fetch from actual SEO API
    setMetrics({
      profileViews: 1247,
      phoneCalls: 89,
      directionRequests: 234,
      websiteClicks: 412,
      reviewsCount: 127,
      averageRating: 4.8,
      photosCount: 45,
    });

    setRankings([
      { keyword: 'fisioterapia [cidade]', rank: 1, previousRank: 2, change: 1, volume: 890, difficulty: 65 },
      { keyword: 'fisioterapeuta [cidade]', rank: 3, previousRank: 3, change: 0, volume: 540, difficulty: 58 },
      { keyword: 'pilates [cidade]', rank: 5, previousRank: 7, change: 2, volume: 1100, difficulty: 72 },
      { keyword: 'fisioterapia dor nas costas', rank: 2, previousRank: 4, change: 2, volume: 320, difficulty: 45 },
      { keyword: 'reabilitação [cidade]', rank: 4, previousRank: 6, change: 2, volume: 210, difficulty: 52 },
      { keyword: 'fisioterapia ortopédica', rank: 6, previousRank: 5, change: -1, volume: 280, difficulty: 61 },
      { keyword: 'pilates solo [cidade]', rank: 8, previousRank: 12, change: 4, volume: 140, difficulty: 38 },
      { keyword: 'fisioterapia pós cirúrgica', rank: 1, previousRank: 3, change: 2, volume: 190, difficulty: 42 },
    ]);
  };

  const addKeyword = () => {
    if (!trackingKeyword) {
      toast.error('Digite uma palavra-chave para rastrear');
      return;
    }

    const newKeyword: KeywordRanking = {
      keyword: `${trackingKeyword}${location ? ` ${location}` : ''}`,
      rank: 0,
      previousRank: 0,
      change: 0,
      volume: 0,
      difficulty: 0,
    };

    setRankings([...rankings, newKeyword]);
    setTrackingKeyword('');
    toast.success('Palavra-chave adicionada ao rastreamento');
  };

  const refreshData = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    loadMockData();
    setRefreshing(false);
    toast.success('Dados atualizados!');
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4" />;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 0) return <Badge variant="outline">Não rankeado</Badge>;
    if (rank <= 3) return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Top 3</Badge>;
    if (rank <= 10) return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Top 10</Badge>;
    return <Badge variant="secondary">#{rank}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6" />
            Rastreador SEO Local
          </h2>
          <p className="text-muted-foreground">
            Monitore suas posições no Google Maps e buscas locais
          </p>
        </div>
        <Button variant="outline" onClick={refreshData} disabled={refreshing}>
          {refreshing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Atualizando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </>
          )}
        </Button>
      </div>

      {/* Google Business Profile Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Google Business Profile
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://business.google.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir no Google
              </a>
            </Button>
          </div>
          <CardDescription>Métricas dos últimos {timeRange === '7d' ? '7 dias' : timeRange === '30d' ? '30 dias' : '90 dias'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            {[
              { value: '7d', label: '7 dias' },
              { value: '30d', label: '30 dias' },
              { value: '90d', label: '90 dias' },
            ].map((range) => (
              <Badge
                key={range.value}
                variant={timeRange === range.value ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setTimeRange(range.value as unknown)}
              >
                {range.label}
              </Badge>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <MetricCard
              icon={Eye}
              label="Visualizações"
              value={metrics.profileViews.toLocaleString()}
              color="text-blue-600"
            />
            <MetricCard
              icon={Clock}
              label="Chamadas"
              value={metrics.phoneCalls.toString()}
              color="text-green-600"
            />
            <MetricCard
              icon={MapPin}
              label="Direções"
              value={metrics.directionRequests.toString()}
              color="text-purple-600"
            />
            <MetricCard
              icon={ExternalLink}
              label="Cliques Site"
              value={metrics.websiteClicks.toString()}
              color="text-orange-600"
            />
            <MetricCard
              icon={Star}
              label="Avaliações"
              value={metrics.reviewsCount.toString()}
              color="text-amber-600"
            />
            <MetricCard
              icon={BarChart3}
              label="Nota Média"
              value={metrics.averageRating.toFixed(1)}
              color="text-emerald-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Keyword Rankings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Ranqueamento de Palavras-chave
          </CardTitle>
          <CardDescription>Posições nas buscas locais do Google</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nova palavra-chave (ex: fisioterapia)"
                value={trackingKeyword}
                onChange={(e) => setTrackingKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
              />
              <Input
                placeholder="Localização (opcional)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <Button onClick={addKeyword}>
                <Search className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Palavra-chave</th>
                  <th className="text-center p-3 font-medium">Posição</th>
                  <th className="text-center p-3 font-medium">Variação</th>
                  <th className="text-center p-3 font-medium">Volume</th>
                  <th className="text-center p-3 font-medium">Dificuldade</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">{item.keyword}</div>
                    </td>
                    <td className="p-3 text-center">
                      {getRankBadge(item.rank)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getChangeIcon(item.change)}
                        <span className={cn(
                          'text-sm font-medium',
                          item.change > 0 ? 'text-emerald-600' : item.change < 0 ? 'text-red-600' : ''
                        )}>
                          {item.change !== 0 && Math.abs(item.change)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center text-sm text-muted-foreground">
                      {item.volume > 0 ? item.volume.toLocaleString() : '-'}
                    </td>
                    <td className="p-3 text-center">
                      {item.difficulty > 0 ? (
                        <Badge
                          variant={item.difficulty < 40 ? 'secondary' : item.difficulty < 70 ? 'default' : 'destructive'}
                        >
                          {item.difficulty}/100
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rankings.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma palavra-chave sendo rastreada</p>
              <p className="text-sm">Adicione palavras-chave acima para começar</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEO Tips */}
      <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-emerald-900 dark:text-emerald-100 mb-2">
                Dicas para Melhorar SEO Local
              </p>
              <ul className="space-y-1 text-emerald-800 dark:text-emerald-200">
                <li>• Mantenha seu perfil do Google Business sempre atualizado</li>
                <li>• Responda a todas as avaliações, positivas e negativas</li>
                <li>• Adicione fotos regularmente do seu estabelecimento</li>
                <li>• Consista o NAP (Nome, Endereço, Phone) em todos os diretórios</li>
                <li>• Peça que clientes satisfeitos deixem reviews no Google</li>
                <li>• Poste atualizações e ofertas no seu perfil do Google</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <Icon className={cn('h-5 w-5 mx-auto mb-1', color)} />
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
