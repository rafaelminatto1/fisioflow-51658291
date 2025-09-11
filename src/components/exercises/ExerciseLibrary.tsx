import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dumbbell,
  Search,
  Filter,
  Clock,
  Target,
  Heart,
  Zap,
  Star,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Play,
  Plus
} from 'lucide-react';
import { useExercises, Exercise } from '@/hooks/useExercises';

interface ExerciseLibraryProps {
  onExerciseSelect: (exercise: Exercise) => void;
  onAddToPlan: (exercise: Exercise) => void;
  className?: string;
}

interface ExerciseCardProps {
  exercise: Exercise;
  onSelect: (exercise: Exercise) => void;
  onAddToPlan: (exercise: Exercise) => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onSelect, onAddToPlan }) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Iniciante': return 'bg-green-100 text-green-800 border-green-200';
      case 'Intermediário': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Avançado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Força': return Dumbbell;
      case 'Cardiovascular': return Heart;
      case 'Flexibilidade': return Target;
      case 'Estabilização': return Zap;
      case 'Mobilidade': return Target;
      case 'Propriocepção': return Target;
      default: return Dumbbell;
    }
  };

  const CategoryIcon = getCategoryIcon(exercise.category);

  return (
    <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/20">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CategoryIcon className="w-5 h-5 text-primary" />
              <div>
                <h4 className="font-semibold text-foreground">{exercise.name}</h4>
                <p className="text-sm text-muted-foreground">{exercise.subcategory}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {exercise.is_favorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
              <Badge className={getDifficultyColor(exercise.difficulty)}>
                {exercise.difficulty}
              </Badge>
            </div>
          </div>

          {/* Image */}
          {exercise.image_url && (
            <div className="relative h-32 bg-muted rounded-lg overflow-hidden">
              <img 
                src={exercise.image_url} 
                alt={exercise.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Play className="w-8 h-8 text-white" />
              </div>
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">{exercise.description}</p>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {exercise.duration} min
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {exercise.usage_count || 0} usos
            </div>
          </div>

          {/* Muscle Groups */}
          <div className="flex flex-wrap gap-1">
            {exercise.muscle_groups.slice(0, 3).map((muscle, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {muscle}
              </Badge>
            ))}
            {exercise.muscle_groups.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{exercise.muscle_groups.length - 3}
              </Badge>
            )}
          </div>

          {/* Equipment */}
          {exercise.equipment.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Equipamentos:</span> {exercise.equipment.join(', ')}
            </div>
          )}

          {/* Contraindications Alert */}
          {exercise.contraindications.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              <span>Possui contraindicações</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button size="sm" onClick={() => onSelect(exercise)} className="flex-1">
              <Play className="w-3 h-3 mr-1" />
              Visualizar
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAddToPlan(exercise)} className="flex-1">
              <Plus className="w-3 h-3 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const ExerciseLibrary: React.FC<ExerciseLibraryProps> = ({
  onExerciseSelect,
  onAddToPlan,
  className
}) => {
  const {
    exercises,
    loading,
    getCategories,
    getSubcategories,
    getMuscleGroups,
    getEquipment,
    getDifficulties,
    searchExercises,
    getPopularExercises,
    getExercisesByCategory,
    getExercisesByDifficulty,
    getExercisesByMuscleGroup
  } = useExercises();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  const filteredExercises = useMemo(() => {
    let filtered = exercises;

    // Aplicar busca por texto
    if (searchQuery.trim()) {
      filtered = searchExercises(searchQuery);
    }

    // Aplicar filtros
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(ex => ex.category === selectedCategory);
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(ex => ex.difficulty === selectedDifficulty);
    }

    if (selectedMuscleGroup !== 'all') {
      filtered = filtered.filter(ex => ex.muscle_groups.includes(selectedMuscleGroup));
    }

    if (selectedEquipment !== 'all') {
      if (selectedEquipment === 'none') {
        filtered = filtered.filter(ex => ex.equipment.length === 0);
      } else {
        filtered = filtered.filter(ex => ex.equipment.includes(selectedEquipment));
      }
    }

    return filtered;
  }, [exercises, searchQuery, selectedCategory, selectedDifficulty, selectedMuscleGroup, selectedEquipment, searchExercises]);

  const popularExercises = getPopularExercises();
  const categories = getCategories();
  const difficulties = getDifficulties();
  const muscleGroups = getMuscleGroups();
  const equipment = getEquipment();

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedDifficulty('all');
    setSelectedMuscleGroup('all');
    setSelectedEquipment('all');
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedDifficulty !== 'all' || 
                         selectedMuscleGroup !== 'all' || selectedEquipment !== 'all';

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground ml-3">Carregando exercícios...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header com Estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-primary" />
            Biblioteca de Exercícios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-xl font-bold text-primary">{exercises.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-xl font-bold text-primary">{categories.length}</div>
              <div className="text-sm text-muted-foreground">Categorias</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-xl font-bold text-primary">{muscleGroups.length}</div>
              <div className="text-sm text-muted-foreground">Grupos Musculares</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-xl font-bold text-primary">{filteredExercises.length}</div>
              <div className="text-sm text-muted-foreground">Filtrados</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros Avançados
            {hasActiveFilters && (
              <Button size="sm" variant="outline" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar exercícios por nome, descrição ou tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros em Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Dificuldade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Dificuldades</SelectItem>
                {difficulties.map(difficulty => (
                  <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Grupo Muscular" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Grupos</SelectItem>
                {muscleGroups.map(muscle => (
                  <SelectItem key={muscle} value={muscle}>{muscle}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
              <SelectTrigger>
                <SelectValue placeholder="Equipamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Equipamentos</SelectItem>
                <SelectItem value="none">Sem Equipamento</SelectItem>
                {equipment.map(eq => (
                  <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todos ({filteredExercises.length})</TabsTrigger>
          <TabsTrigger value="popular">Populares ({popularExercises.length})</TabsTrigger>
          <TabsTrigger value="categories">Por Categoria</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredExercises.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onSelect={onExerciseSelect}
                  onAddToPlan={onAddToPlan}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhum exercício encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Tente ajustar os filtros ou buscar por outros termos.
                </p>
                {hasActiveFilters && (
                  <Button onClick={clearFilters}>
                    Limpar Filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="popular" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularExercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onSelect={onExerciseSelect}
                onAddToPlan={onAddToPlan}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          {categories.map(category => {
            const categoryExercises = getExercisesByCategory(category);
            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    {category} ({categoryExercises.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryExercises.slice(0, 6).map((exercise) => (
                      <ExerciseCard
                        key={exercise.id}
                        exercise={exercise}
                        onSelect={onExerciseSelect}
                        onAddToPlan={onAddToPlan}
                      />
                    ))}
                  </div>
                  {categoryExercises.length > 6 && (
                    <div className="text-center mt-4">
                      <Button variant="outline" onClick={() => {
                        setSelectedCategory(category);
                        setActiveTab('all');
                      }}>
                        Ver todos os {categoryExercises.length} exercícios de {category}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};