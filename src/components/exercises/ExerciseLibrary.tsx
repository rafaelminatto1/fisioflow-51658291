import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExercises } from '@/hooks/useExercises';
import { useExerciseFavorites } from '@/hooks/useExerciseFavorites';
import { cn } from '@/lib/utils';
import { 
  Search, 
  Filter, 
  Heart, 
  Play, 
  Plus, 
  Clock, 
  Target, 
  AlertTriangle,
  BookOpen,
  Award,
  Users,
  Zap,
  Settings
} from 'lucide-react';

interface ExerciseLibraryProps {
  onExerciseSelect?: (exercise: Exercise) => void;
  onAddToPlan?: (exercise: Exercise) => void;
  className?: string;
}

export function ExerciseLibrary({ 
  onExerciseSelect, 
  onAddToPlan,
  className 
}: ExerciseLibraryProps) {
  const { exercises, loading } = useExercises();
  const { favorites, addToFavorites, removeFromFavorites } = useExerciseFavorites();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBodyRegion, setSelectedBodyRegion] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { value: "strength", label: "Fortalecimento", icon: "💪" },
    { value: "flexibility", label: "Flexibilidade", icon: "🤸" },
    { value: "balance", label: "Equilíbrio", icon: "⚖️" },
    { value: "cardio", label: "Cardiovascular", icon: "❤️" },
    { value: "functional", label: "Funcional", icon: "🏃" },
    { value: "neuromuscular", label: "Neuromuscular", icon: "🧠" }
  ];

  const bodyRegions = [
    { value: "cervical", label: "Cervical", icon: "🦴" },
    { value: "thoracic", label: "Torácica", icon: "🫁" },
    { value: "lumbar", label: "Lombar", icon: "🦴" },
    { value: "upper_limb", label: "Membro Superior", icon: "💪" },
    { value: "lower_limb", label: "Membro Inferior", icon: "🦵" },
    { value: "core", label: "Core", icon: "🎯" },
    { value: "full_body", label: "Corpo Inteiro", icon: "🏋️" }
  ];

  const difficultyLevels = [
    { value: "beginner", label: "Iniciante", color: "bg-green-100 text-green-800" },
    { value: "intermediate", label: "Intermediário", color: "bg-yellow-100 text-yellow-800" },
    { value: "advanced", label: "Avançado", color: "bg-red-100 text-red-800" }
  ];

  const filteredExercises = useMemo(() => {
    return exercises.filter(exercise => {
      const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          exercise.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || exercise.category === selectedCategory;
      const matchesBodyRegion = selectedBodyRegion === "all" || exercise.body_region === selectedBodyRegion;
      const matchesDifficulty = selectedDifficulty === "all" || exercise.difficulty_level === selectedDifficulty;
      const matchesFavorites = !showFavoritesOnly || favorites.some(fav => fav.exercise_id === exercise.id);

      return matchesSearch && matchesCategory && matchesBodyRegion && matchesDifficulty && matchesFavorites;
    });
  }, [exercises, searchTerm, selectedCategory, selectedBodyRegion, selectedDifficulty, showFavoritesOnly, favorites]);

  const handleToggleFavorite = (exerciseId: string) => {
    const isFavorite = favorites.some(fav => fav.exercise_id === exerciseId);
    if (isFavorite) {
      removeFromFavorites(exerciseId);
    } else {
      addToFavorites(exerciseId);
    }
  };

  const getDifficultyBadgeColor = (level: string) => {
    switch (level) {
      case "beginner": return "bg-green-100 text-green-800";
      case "intermediate": return "bg-yellow-100 text-yellow-800";
      case "advanced": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(cat => cat.value === category);
    return categoryData?.icon || "🏃";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search and Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar exercícios por nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="favorites-only"
                checked={showFavoritesOnly}
                onCheckedChange={setShowFavoritesOnly}
              />
              <label htmlFor="favorites-only" className="text-sm font-medium flex items-center gap-1">
                <Heart className="w-4 h-4" />
                Favoritos
              </label>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Categoria</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Região Corporal</label>
                <Select value={selectedBodyRegion} onValueChange={setSelectedBodyRegion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as regiões</SelectItem>
                    {bodyRegions.map(region => (
                      <SelectItem key={region.value} value={region.value}>
                        {region.icon} {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Dificuldade</label>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as dificuldades</SelectItem>
                    {difficultyLevels.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {filteredExercises.length} exercícios encontrados
        </div>
        
        {filteredExercises.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {favorites.length} favoritos salvos
          </div>
        )}
      </div>

      {/* Exercise Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExercises.map((exercise) => {
          const isFavorite = favorites.some(fav => fav.exercise_id === exercise.id);
          
          return (
            <Card key={exercise.id} className="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                      {exercise.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {getCategoryIcon(exercise.category)} {categories.find(cat => cat.value === exercise.category)?.label}
                      </Badge>
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs", getDifficultyBadgeColor(exercise.difficulty_level))}
                      >
                        {difficultyLevels.find(level => level.value === exercise.difficulty_level)?.label}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleFavorite(exercise.id)}
                    className="p-1 h-auto"
                  >
                    <Heart 
                      className={cn(
                        "w-4 h-4 transition-colors",
                        isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-red-500"
                      )}
                    />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {exercise.description}
                </p>

                {/* Exercise Metadata */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Target className="w-3 h-3" />
                    {bodyRegions.find(region => region.value === exercise.body_region)?.label}
                  </div>
                  
                  {exercise.duration && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {exercise.duration} min
                    </div>
                  )}
                  
                  {exercise.contraindications && exercise.contraindications.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="w-3 h-3" />
                      {exercise.contraindications.length} contraindicação(ões)
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1"
                    onClick={() => onExerciseSelect?.(exercise)}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Visualizar
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAddToPlan?.(exercise)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredExercises.length === 0 && (
        <Card className="p-12 text-center">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum exercício encontrado</h3>
          <p className="text-muted-foreground mb-6">
            Tente ajustar seus filtros ou termo de busca para encontrar exercícios relevantes
          </p>
          <div className="flex gap-2 justify-center">
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
                setSelectedBodyRegion("all");
                setSelectedDifficulty("all");
                setShowFavoritesOnly(false);
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      {filteredExercises.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{exercises.length}</div>
            <div className="text-sm text-muted-foreground">Total de Exercícios</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{categories.length}</div>
            <div className="text-sm text-muted-foreground">Categorias</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{favorites.length}</div>
            <div className="text-sm text-muted-foreground">Favoritos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{filteredExercises.length}</div>
            <div className="text-sm text-muted-foreground">Filtrados</div>
          </div>
        </div>
      )}
    </div>
  );
}