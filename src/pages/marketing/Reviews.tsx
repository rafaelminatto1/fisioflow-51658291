import React, { useEffect, useState, useMemo } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {

  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Star,
  TrendingUp,
  MessageSquare,
  Search,
  Filter,
  ExternalLink,
  ThumbsUp,
  AlertCircle,
  Share2,
  Reply,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface GoogleReview {
  author: string;
  rating: number;
  comment: string;
  date: string;
  time?: number;
}

type SortOption = 'recent' | 'oldest' | 'highest' | 'lowest';
type FilterRating = 'all' | 5 | 4 | 3 | 2 | 1;

export default function ReviewsPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState<FilterRating>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 10;

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        setError(null);
        const getReviews = httpsCallable(functions, 'getBusinessReviews');
        const result = await getReviews();
        const data = result.data as any;
        setReviews(data.reviews || []);
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError('Não foi possível carregar as avaliações. Verifique se a função do Firebase está configurada.');
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [toast]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (reviews.length === 0) return null;

    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    return {
      totalReviews,
      averageRating,
      ratingDistribution,
    };
  }, [reviews]);

  // Filter and sort reviews
  const filteredReviews = useMemo(() => {
    let filtered = [...reviews];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.comment.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply rating filter
    if (filterRating !== 'all') {
      filtered = filtered.filter((r) => r.rating === filterRating);
    }

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        filtered.sort((a, b) => (a.time || 0) - (b.time || 0));
        break;
      case 'highest':
        filtered.sort((a, b) => b.rating - a.rating || (b.time || 0) - (a.time || 0));
        break;
      case 'lowest':
        filtered.sort((a, b) => a.rating - b.rating || (b.time || 0) - (a.time || 0));
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => (b.time || 0) - (a.time || 0));
        break;
    }

    return filtered;
  }, [reviews, searchTerm, filterRating, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * reviewsPerPage,
    currentPage * reviewsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRating, sortBy]);

  const handleShare = (review: GoogleReview) => {
    const text = `⭐ ${review.rating}/5 - "${review.comment}" - ${review.author}`;
    if (navigator.share) {
      navigator.share({
        title: 'Avaliação Google',
        text: text,
      });
    } else {
      navigator.clipboard.writeText(text);
      toast({
        title: 'Copiado!',
        description: 'Avaliação copiada para a área de transferência',
      });
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800';
    if (rating >= 4) return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
    if (rating >= 3.5) return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800';
    if (rating >= 3) return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800';
    return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800';
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <Star className="h-8 w-8 animate-pulse text-primary" />
              <p className="text-muted-foreground">Carregando avaliações...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Star className="h-8 w-8 text-amber-500 fill-amber-500" />
            Avaliações Google
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie e acompanhe as avaliações dos seus pacientes
          </p>
        </div>
        <Button variant="outline" asChild>
          <a
            href="https://search.google.com/local/writereview"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Solicitar Avaliação
          </a>
        </Button>
      </div>

      {metrics && (
        <>
          {/* Metrics Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Overall Rating */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avaliação Média
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-bold">
                    {metrics.averageRating.toFixed(1)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-0.5 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-5 w-5',
                            i < Math.round(metrics.averageRating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300 dark:text-gray-600'
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {metrics.totalReviews} avaliações
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href="https://search.google.com/local/writereview"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Ver no Google
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Rating Distribution */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Distribuição de Avaliações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = metrics.ratingDistribution[star as keyof typeof metrics.ratingDistribution];
                    const percentage = metrics.totalReviews > 0
                      ? (count / metrics.totalReviews) * 100
                      : 0;
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-16 shrink-0">
                          <span className="text-sm font-medium">{star}</span>
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
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
                        <span className="text-sm text-muted-foreground w-12 text-right shrink-0">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou comentário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={filterRating} onValueChange={(v: FilterRating) => setFilterRating(v)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filtrar por nota" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as notas</SelectItem>
                      <SelectItem value="5">5 estrelas</SelectItem>
                      <SelectItem value="4">4 estrelas</SelectItem>
                      <SelectItem value="3">3 estrelas</SelectItem>
                      <SelectItem value="2">2 estrelas</SelectItem>
                      <SelectItem value="1">1 estrela</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v: SortOption) => setSortBy(v)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Mais recentes</SelectItem>
                      <SelectItem value="oldest">Mais antigas</SelectItem>
                      <SelectItem value="highest">Maiores notas</SelectItem>
                      <SelectItem value="lowest">Menores notas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Mostrando {filteredReviews.length} de {metrics.totalReviews} avaliações
              </p>
            </CardContent>
          </Card>

          {/* Reviews List */}
          {filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    {searchTerm || filterRating !== 'all'
                      ? 'Nenhuma avaliação encontrada com os filtros aplicados.'
                      : 'Nenhuma avaliação encontrada.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4">
                {paginatedReviews.map((review, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Avatar */}
                          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold text-lg">
                            {review.author.charAt(0).toUpperCase()}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-semibold">{review.author}</h3>
                              <Badge className={getRatingColor(review.rating)}>
                                <Star className="h-3 w-3 fill-current mr-1" />
                                {review.rating}/5
                              </Badge>
                            </div>

                            {/* Stars */}
                            <div className="flex items-center gap-0.5 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    'h-4 w-4',
                                    i < review.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-gray-300 dark:text-gray-600'
                                  )}
                                />
                              ))}
                            </div>

                            {/* Comment */}
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {review.comment}
                            </p>

                            {/* Date */}
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              {review.time
                                ? format(new Date(review.time), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                                    locale: ptBR,
                                  })
                                : review.date}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleShare(review)}
                            title="Compartilhar"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        const isActive = page === currentPage;
                        return (
                          <Button
                            key={page}
                            variant={isActive ? 'default' : 'outline'}
                            size="icon"
                            className="w-9 h-9"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && (
                        <>
                          <span className="px-2">...</span>
                          <Button
                            variant={currentPage === totalPages ? 'default' : 'outline'}
                            size="icon"
                            className="w-9 h-9"
                            onClick={() => setCurrentPage(totalPages)}
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
      </div>
    </MainLayout>
  );
}
