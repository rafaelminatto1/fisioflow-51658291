import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExerciseCard } from './ExerciseCard';
import { useExercises } from '@/hooks/useExercises';
import { useExerciseFavorites } from '@/hooks/useExerciseFavorites';
import { Search, Filter, Heart, Grid, List } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  targetMuscles: string[];
  equipment?: string[];
}

interface ExerciseLibraryProps {
  onExerciseSelect?: (exercise: Exercise) => void;
  selectedExercises?: Exercise[];
  showSelectionMode?: boolean;
  className?: string;
}

export function ExerciseLibrary({ 
  onExerciseSelect, 
  selectedExercises = [],
  showSelectionMode = false,
  className = '' 
}: ExerciseLibraryProps) {
  const { exercises, loading } = useExercises();
  const { favorites, isFavorite, toggleFavorite } = useExerciseFavorites();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categories = [
    'fortalecimento',
    'alongamento', 
    'mobilidade',
    'cardio',
    'equilibrio',
    'respiratorio'
  ];

  const difficulties = ['iniciante', 'intermediario', 'avancado'];
  
  const equipments = [
    'Sem equipamento',
    'Halteres',
    'Elásticos',
    'Bola suíça',
    'Colchonete',
    'Bastão',
    'Theraband',
    'Step',
    'Cones',
    'Aparelhos'
  ];

  const filteredExercises = useMemo(() => {
    return exercises.filter(exercise => {
      // Filtro de busca
      const matchesSearch = !searchQuery || 
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exercise.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exercise.targetMuscles.some(muscle => 
          muscle.toLowerCase().includes(searchQuery.toLowerCase())
        );

      // Filtro de categoria
      const matchesCategory = categoryFilter === 'all' || 
        exercise.category === categoryFilter;

      // Filtro de dificuldade
      const matchesDifficulty = difficultyFilter === 'all' || 
        exercise.difficulty === difficultyFilter;

      // Filtro de equipamento
      const matchesEquipment = equipmentFilter === 'all' || 
        !exercise.equipment?.length ||
        exercise.equipment.some(eq => eq === equipmentFilter);

      // Filtro de favoritos
      const matchesFavorites = !showFavoritesOnly || isFavorite(exercise.id);

      return matchesSearch && matchesCategory && matchesDifficulty && 
             matchesEquipment && matchesFavorites;
    });
  }, [exercises, searchQuery, categoryFilter, difficultyFilter, equipmentFilter, showFavoritesOnly, isFavorite]);

  const isSelected = (exerciseId: string) => {
    return selectedExercises.some(ex => ex.id === exerciseId);
  };

  const handleExerciseAction = (exercise: Exercise) => {
    if (showSelectionMode && onExerciseSelect) {
      onExerciseSelect(exercise);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-video bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Biblioteca de Exercícios</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Heart className={`w-4 h-4 mr-1 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              Favoritos
            </Button>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none border-r"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Busca */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar exercícios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categoria */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Dificuldade */}
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Dificuldade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas dificuldades</SelectItem>
              {difficulties.map(difficulty => (
                <SelectItem key={difficulty} value={difficulty}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Equipamento */}
          <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Equipamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos equipamentos</SelectItem>
              {equipments.map(equipment => (
                <SelectItem key={equipment} value={equipment}>
                  {equipment}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Contadores */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{filteredExercises.length} exercícios encontrados</span>
          {showFavoritesOnly && (
            <Badge variant="outline" className="text-xs">
              <Heart className="w-3 h-3 mr-1 fill-current" />
              Apenas favoritos
            </Badge>
          )}
        </div>

        {/* Grid de exercícios */}
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
        }>
          {filteredExercises.map(exercise => (
            <div key={exercise.id} className="relative">
              <ExerciseCard
                exercise={exercise}
                isFavorite={isFavorite(exercise.id)}
                onAddToPlan={() => handleExerciseAction(exercise)}
                className={
                  showSelectionMode && isSelected(exercise.id)
                    ? 'ring-2 ring-primary'
                    : ''
                }
              />
              
              {/* Indicador de seleção */}
              {showSelectionMode && isSelected(exercise.id) && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">✓</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Estado vazio */}
        {filteredExercises.length === 0 && (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum exercício encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Tente ajustar os filtros ou buscar por outros termos
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setDifficultyFilter('all');
                setEquipmentFilter('all');
                setShowFavoritesOnly(false);
              }}
            >
              Limpar filtros
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}