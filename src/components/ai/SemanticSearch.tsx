/**
 * Componente de Busca Semântica
 *
 * Busca evoluções usando linguagem natural
 */

import React, { useState, useCallback } from 'react';
import { Search, FileText, Calendar, User, TrendingUp } from 'lucide-react';
import { findSimilarEvolutions } from '@/lib/services/vector-search';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logging/logger';

interface SemanticSearchProps {
  organizationId?: string;
  patientId?: string;
  onSelectEvolution?: (evolutionId: string) => void;
  className?: string;
}

interface SearchResult {
  evolutionId: string;
  date: string;
  patientName: string;
  patientId: string;
  soap: string;
  similarity: number;
}

export function SemanticSearch({
  organizationId,
  patientId,
  onSelectEvolution,
  className = '',
}: SemanticSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedQuery = useDebounce(query, 500);

  const handleSearch = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.trim().length < 3) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setHasSearched(true);

    try {
      const searchResults = await findSimilarEvolutions(debouncedQuery, {
        limit: 10,
        minSimilarity: 0.65,
        organizationId,
        patientId,
      });

      const formatted: SearchResult[] = searchResults.map(r => ({
        evolutionId: r.evolutionId,
        date: r.evolution.date,
        patientName: r.evolution.patientName || 'Paciente',
        patientId: r.evolution.patientId,
        soap: [
          r.evolution.subjective && `S: ${r.evolution.subjective}`,
          r.evolution.objective && `O: ${r.evolution.objective}`,
          r.evolution.assessment && `A: ${r.evolution.assessment}`,
          r.evolution.plan && `P: ${r.evolution.plan}`,
        ].filter(Boolean).join('\n'),
        similarity: r.similarity,
      }));

      setResults(formatted);
      logger.info(`[SemanticSearch] ${formatted.length} resultados para "${debouncedQuery}"`);
    } catch (error) {
      logger.error('[SemanticSearch] Erro na busca:', error);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [debouncedQuery, organizationId, patientId]);

  React.useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.85) return 'bg-green-100 text-green-800 border-green-300';
    if (similarity >= 0.75) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (similarity >= 0.65) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getSimilarityLabel = (similarity: number) => {
    if (similarity >= 0.85) return 'Muito Similar';
    if (similarity >= 0.75) return 'Similar';
    if (similarity >= 0.65) return 'Parcialmente Similar';
    return 'Pouco Similar';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Busque casos similares (ex: 'dor lombar com restrição de movimento')..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-10 h-12 text-base"
          disabled={searching}
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Examples */}
      {!hasSearched && !query && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Tente buscar por:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'dor lombar aguda',
              'pós-operatório joelho',
              'limitação de movimento ombro',
              'dor ao caminhar',
              'fraqueza muscular',
            ].map(example => (
              <Button
                key={example}
                variant="outline"
                size="sm"
                onClick={() => setQuery(example)}
                className="text-xs"
              >
                {example}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {hasSearched && !searching && (
        <div className="space-y-3">
          {results.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma evolução similar encontrada</p>
                <p className="text-sm mt-1">Tente termos diferentes ou mais específicos</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {results.length} {results.length === 1 ? 'evolução encontrada' : 'evoluções encontradas'}
              </p>

              {results.map((result, index) => (
                <Card
                  key={result.evolutionId}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onSelectEvolution?.(result.evolutionId)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(result.date).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{result.patientName}</span>
                      </div>

                      <Badge
                        variant="outline"
                        className={getSimilarityColor(result.similarity)}
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {(result.similarity * 100).toFixed(0)}% {getSimilarityLabel(result.similarity)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <CardDescription className="whitespace-pre-wrap line-clamp-4">
                      {result.soap}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {searching && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Widget compacto de busca semântica
 */
export function SemanticSearchWidget(props: SemanticSearchProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start"
      >
        <Search className="h-4 w-4 mr-2" />
        Buscar casos similares...
      </Button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 p-4 bg-background border rounded-lg shadow-lg">
          <SemanticSearch {...props} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="w-full mt-2"
          >
            Fechar
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Badge de similaridade
 */
export function SimilarityBadge({ similarity }: { similarity: number }) {
  const getColor = () => {
    if (similarity >= 0.85) return 'text-green-700 bg-green-50';
    if (similarity >= 0.75) return 'text-blue-700 bg-blue-50';
    if (similarity >= 0.65) return 'text-yellow-700 bg-yellow-50';
    return 'text-gray-700 bg-gray-50';
  };

  return (
    <Badge className={getColor()}>
      {(similarity * 100).toFixed(0)}% similar
    </Badge>
  );
}

/**
 * Example queries display
 */
export function SemanticSearchExamples({
  onSelect,
}: {
  onSelect: (query: string) => void;
}) {
  const examples = [
    {
      query: 'pacientes com dor lombar que melhoraram com exercícios de ponte',
      category: 'Tratamento eficaz',
    },
    {
      query: 'casos de lesão de LCA com retorno ao esporte',
      category: 'Reabilitação esportiva',
    },
    {
      query: 'pacientes com frozen shoulder',
      category: 'Condição específica',
    },
    {
      query: 'exercícios para dor no ombro com limitação de abdução',
      category: 'Sintoma específico',
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Exemplos de busca:</p>
      <div className="space-y-2">
        {examples.map((example, index) => (
          <button
            key={index}
            onClick={() => onSelect(example.query)}
            className="block w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <p className="text-sm font-medium">{example.query}</p>
            <p className="text-xs text-muted-foreground mt-1">{example.category}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Empty state for semantic search
 */
export function SemanticSearchEmptyState({
  onSearch,
}: {
  onSearch: (query: string) => void;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">Busca Semântica</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Encontre evoluções similares usando linguagem natural. Descreva sintomas, tratamentos ou condições.
        </p>
        <SemanticSearchExamples onSelect={onSearch} />
      </CardContent>
    </Card>
  );
}
