import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where, getAggregateFromServer, count, average } from 'firebase/firestore';
import { functions, db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  TrendingUp,
  Users,
  Video,
  MessageSquare,
  Mail,
  ArrowUpRight,
  ArrowDown,
  Activity,
  BarChart3,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoogleReview {
  author: string;
  rating: number;
  comment: string;
  date: string;
}

interface MarketingMetrics {
  totalReviews: number;
  averageRating: number;
  rating5: number;
  rating4: number;
  rating3: number;
  rating2: number;
  rating1: number;
  recentReviews: GoogleReview[];
  totalExports: number;
  totalCampaigns: number;
  totalLeads: number;
}

export default function MarketingDashboard() {
  const [metrics, setMetrics] = useState<MarketingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch Google Reviews
        let reviews: GoogleReview[] = [];
        let totalReviews = 0;
        let averageRating = 0;
        let rating5 = 0;
        let rating4 = 0;
        let rating3 = 0;
        let rating2 = 0;
        let rating1 = 0;

        try {
          const getReviews = httpsCallable(functions, 'getBusinessReviews');
          const result = await getReviews();
          reviews = (result.data as any).reviews || [];

          totalReviews = reviews.length;
          if (totalReviews > 0) {
            averageRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews;
            rating5 = reviews.filter((r: any) => r.rating === 5).length;
            rating4 = reviews.filter((r: any) => r.rating === 4).length;
            rating3 = reviews.filter((r: any) => r.rating === 3).length;
            rating2 = reviews.filter((r: any) => r.rating === 2).length;
            rating1 = reviews.filter((r: any) => r.rating === 1).length;
          }
        } catch (err) {
          console.error('Error fetching reviews:', err);
        }

        // Fetch Marketing Exports count
        let totalExports = 0;
        try {
          const exportsQuery = query(collection(db, 'marketing_exports'));
          const exportsSnapshot = await getDocs(exportsQuery);
          totalExports = exportsSnapshot.size;
        } catch (err) {
          console.error('Error fetching exports:', err);
        }

        // Fetch Campaigns count
        let totalCampaigns = 0;
        try {
          const campaignsQuery = query(collection(db, 'crm_campanhas'));
          const campaignsSnapshot = await getDocs(campaignsQuery);
          totalCampaigns = campaignsSnapshot.size;
        } catch (err) {
          console.error('Error fetching campaigns:', err);
        }

        // Fetch Leads count
        let totalLeads = 0;
        try {
          const leadsQuery = query(collection(db, 'crm_leads'));
          const leadsSnapshot = await getDocs(leadsQuery);
          totalLeads = leadsSnapshot.size;
        } catch (err) {
          console.error('Error fetching leads:', err);
        }

        setMetrics({
          totalReviews,
          averageRating,
          rating5,
          rating4,
          rating3,
          rating2,
          rating1,
          recentReviews: reviews.slice(0, 5),
          totalExports,
          totalCampaigns,
          totalLeads,
        });
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError('Erro ao carregar métricas de marketing');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (rating >= 4) return 'text-green-600 bg-green-50 border-green-200';
    if (rating >= 3.5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (rating >= 3) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    href,
    color = 'blue'
  }: {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    trend?: { value: number; isPositive: boolean };
    href?: string;
    color?: 'blue' | 'green' | 'purple' | 'amber' | 'emerald';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      green: 'bg-green-500/10 text-green-600 dark:text-green-400',
      purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    };

    const cardContent = (
      <Card className={cn('hover:shadow-lg transition-all duration-300', href && 'cursor-pointer group')}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={cn('p-2 rounded-lg', colorClasses[color])}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold">{value}</div>
            {trend && (
              <div className={cn(
                'flex items-center text-xs font-medium',
                trend.isPositive ? 'text-emerald-600' : 'text-red-600'
              )}>
                {trend.isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                {trend.value}%
              </div>
            )}
          </div>
          {href && (
            <div className="mt-2 flex items-center text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              Ver detalhes <ExternalLink className="h-3 w-3 ml-1" />
            </div>
          )}
        </CardContent>
      </Card>
    );

    if (href) {
      return <Link to={href}>{cardContent}</Link>;
    }
    return cardContent;
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <Activity className="h-8 w-8 animate-pulse text-primary" />
            <p className="text-muted-foreground">Carregando métricas de marketing...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <Activity className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Marketing</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral das métricas e atividades de marketing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Últimos 30 dias
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Avaliações Google"
          value={metrics?.totalReviews || 0}
          icon={Star}
          color="amber"
          trend={{ value: 12, isPositive: true }}
          href="/marketing/reviews"
        />
        <StatCard
          title="Média de Avaliação"
          value={metrics?.averageRating.toFixed(1) || '-'}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Exportações de Conteúdo"
          value={metrics?.totalExports || 0}
          icon={Video}
          color="purple"
          href="/marketing/exports"
        />
        <StatCard
          title="Campanhas Ativas"
          value={metrics?.totalCampaigns || 0}
          icon={Mail}
          color="blue"
          href="/crm/campanhas"
        />
      </div>

      {/* Rating Distribution */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Distribuição de Avaliações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = metrics?.[`rating${star}` as keyof MarketingMetrics] as number || 0;
              const percentage = metrics?.totalReviews
                ? (count / metrics.totalReviews) * 100
                : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium">{star}</span>
                    <Star className={cn(
                      'h-4 w-4',
                      count > 0 ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                    )} />
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-500',
                        star >= 4 ? 'bg-emerald-500' :
                        star === 3 ? 'bg-yellow-500' : 'bg-red-500'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Avaliações Recentes
              </div>
              <Link to="/marketing/reviews">
                <Button variant="ghost" size="sm">
                  Ver todas
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics?.recentReviews && metrics.recentReviews.length > 0 ? (
                metrics.recentReviews.map((review, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold">
                      {review.author.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{review.author}</p>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, j) => (
                            <Star
                              key={j}
                              className={cn(
                                'h-3 w-3',
                                j < review.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-gray-300'
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {review.comment}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma avaliação encontrada</p>
                </div>
              )}
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
          <div className="grid gap-4 md:grid-cols-3">
            <Link to="/marketing/content-generator" className="group">
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Criar Conteúdo</p>
                    <p className="text-sm text-muted-foreground">Gerar posts para redes sociais</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link to="/marketing/reviews" className="group">
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Star className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Ver Avaliações</p>
                    <p className="text-sm text-muted-foreground">Gerenciar avaliações do Google</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link to="/crm/campanhas" className="group">
              <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Campanhas</p>
                    <p className="text-sm text-muted-foreground">Gerenciar campanhas de marketing</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
