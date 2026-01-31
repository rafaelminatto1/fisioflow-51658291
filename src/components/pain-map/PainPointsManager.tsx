import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Search, SortAsc, SortDesc, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PainPoint } from './BodyMap';
import { PainType } from '@/types/painMap';

interface PainPointsManagerProps {
  points: PainPoint[];
  onPointEdit?: (point: PainPoint) => void;
  onPointRemove?: (pointId: string) => void;
  onPointSelect?: (pointId: string) => void;
  selectedPointId?: string;
  className?: string;
}

type SortField = 'intensity' | 'region' | 'painType' | 'date';
type SortOrder = 'asc' | 'desc';
type FilterPainType = PainType | 'all';
type FilterIntensity = 'all' | 'low' | 'medium' | 'high' | 'severe';

const PAIN_TYPE_LABELS: Record<PainType, string> = {
  aguda: 'Aguda',
  cronica: 'Crônica',
  latejante: 'Latejante',
  queimacao: 'Queimação',
  formigamento: 'Formigamento',
  dormencia: 'Dormência',
  peso: 'Peso',
  pontada: 'Pontada',
  sharp: 'Aguda',
  throbbing: 'Latejante',
  burning: 'Queimação',
  tingling: 'Formigamento',
  numbness: 'Dormência',
  stiffness: 'Rigidez',
};

const PAIN_TYPE_ICONS: Record<PainType, string> = {
  aguda: '⚡',
  cronica: '⏳',
  latejante: '💓',
  queimacao: '🔥',
  formigamento: '✨',
  dormencia: '❄️',
  peso: '🔒',
  pontada: '📌',
  sharp: '⚡',
  throbbing: '💓',
  burning: '🔥',
  tingling: '✨',
  numbness: '❄️',
  stiffness: '🔒',
};

function getIntensityColor(intensity: number): string {
  if (intensity <= 2) return '#22c55e';
  if (intensity <= 4) return '#eab308';
  if (intensity <= 6) return '#f97316';
  if (intensity <= 8) return '#ef4444';
  return '#7f1d1d';
}

export function PainPointsManager({
  points,
  onPointEdit,
  onPointRemove,
  onPointSelect,
  selectedPointId,
  className,
}: PainPointsManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('intensity');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterType, setFilterType] = useState<FilterPainType>('all');
  const [filterIntensity, setFilterIntensity] = useState<FilterIntensity>('all');

  // Filtrar e ordenar pontos
  const filteredAndSortedPoints = useMemo(() => {
    let result = [...points];

    // Filtro de busca
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.region.toLowerCase().includes(searchLower) ||
        p.muscleName?.toLowerCase().includes(searchLower) ||
        p.notes?.toLowerCase().includes(searchLower) ||
        p.painType.toLowerCase().includes(searchLower)
      );
    }

    // Filtro de tipo de dor
    if (filterType !== 'all') {
      result = result.filter(p => p.painType === filterType);
    }

    // Filtro de intensidade
    if (filterIntensity !== 'all') {
      result = result.filter(p => {
        if (filterIntensity === 'low') return p.intensity <= 3;
        if (filterIntensity === 'medium') return p.intensity >= 4 && p.intensity <= 6;
        if (filterIntensity === 'high') return p.intensity >= 7 && p.intensity <= 8;
        if (filterIntensity === 'severe') return p.intensity >= 9;
        return true;
      });
    }

    // Ordenação
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'intensity':
          comparison = a.intensity - b.intensity;
          break;
        case 'region':
          comparison = a.region.localeCompare(b.region);
          break;
        case 'painType':
          comparison = a.painType.localeCompare(b.painType);
          break;
        case 'date':
          comparison = 0; // Data não está disponível no PainPoint atual
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [points, searchQuery, sortField, sortOrder, filterType, filterIntensity]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = points.length;
    const avgIntensity = total > 0
      ? points.reduce((sum, p) => sum + p.intensity, 0) / total
      : 0;
    const highIntensity = points.filter(p => p.intensity >= 7).length;
    const muscleSpecific = points.filter(p => p.muscleCode).length;
    const chronic = points.filter(p => p.painType === 'cronica' || p.painType === 'stiffness').length;

    return { total, avgIntensity, highIntensity, muscleSpecific, chronic };
  }, [points]);

  const toggleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterIntensity('all');
  };

  const hasActiveFilters = searchQuery || filterType !== 'all' || filterIntensity !== 'all';

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header com Estatísticas */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Pontos de Dor</span>
            <Badge variant="outline">{stats.total} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-lg font-bold" style={{ color: getIntensityColor(stats.avgIntensity) }}>
                {stats.avgIntensity.toFixed(1)}
              </div>
              <div className="text-[10px] text-muted-foreground">Média</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-lg font-bold text-red-500">{stats.highIntensity}</div>
              <div className="text-[10px] text-muted-foreground">Alta</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-lg font-bold text-primary">{stats.muscleSpecific}</div>
              <div className="text-[10px] text-muted-foreground">Músculos</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-lg font-bold text-orange-500">{stats.chronic}</div>
              <div className="text-[10px] text-muted-foreground">Crônicos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros e Busca */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="space-y-3">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por região, músculo, notas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterPainType)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Tipo de dor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {Object.entries(PAIN_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {PAIN_TYPE_ICONS[value as PainType]} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterIntensity} onValueChange={(v) => setFilterIntensity(v as FilterIntensity)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Intensidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="low">Leve (1-3)</SelectItem>
                  <SelectItem value="medium">Moderada (4-6)</SelectItem>
                  <SelectItem value="high">Alta (7-8)</SelectItem>
                  <SelectItem value="severe">Severa (9-10)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ordenação e Limpar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                  <SelectTrigger className="h-8 w-auto text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intensity">Intensidade</SelectItem>
                    <SelectItem value="region">Região</SelectItem>
                    <SelectItem value="painType">Tipo</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={toggleSort}
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={clearFilters}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pontos */}
      <Card className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {filteredAndSortedPoints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Filter className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-sm font-medium text-foreground mb-1">
                  {hasActiveFilters ? 'Nenhum ponto encontrado' : 'Nenhum ponto registrado'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasActiveFilters
                    ? 'Tente ajustar os filtros de busca'
                    : 'Clique no mapa para adicionar pontos de dor'}
                </p>
              </div>
            ) : (
              filteredAndSortedPoints.map((point) => {
                const color = getIntensityColor(point.intensity);
                const isSelected = selectedPointId === point.id;

                return (
                  <div
                    key={point.id}
                    className={cn(
                      'p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md',
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    )}
                    onClick={() => onPointSelect?.(point.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Indicador de Intensidade */}
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                          'font-bold text-sm border-2'
                        )}
                        style={{
                          backgroundColor: `${color}15`,
                          borderColor: `${color}40`,
                          color: color,
                        }}
                      >
                        {point.intensity}
                      </div>

                      {/* Informações */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-foreground">
                              {point.region}
                            </h4>
                            {point.muscleName && (
                              <p className="text-xs text-primary font-medium">
                                💪 {point.muscleName}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0"
                            style={{ borderColor: `${color}40`, color }}
                          >
                            {PAIN_TYPE_ICONS[point.painType]} {PAIN_TYPE_LABELS[point.painType]}
                          </Badge>
                        </div>

                        {point.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {point.notes}
                          </p>
                        )}

                        {/* Ações rápidas */}
                        <div className="flex gap-2 mt-2">
                          {onPointEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPointEdit(point);
                              }}
                            >
                              Editar
                            </Button>
                          )}
                          {onPointRemove && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPointRemove(point.id);
                              }}
                            >
                              Remover
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Footer com informações */}
      {filteredAndSortedPoints.length > 0 && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          Mostrando {filteredAndSortedPoints.length} de {points.length} pontos
          {hasActiveFilters && ' (filtrado)'}
        </div>
      )}
    </div>
  );
}
