import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Heart, 
  Play, 
  Star, 
  Clock, 
  Plus, 
  ExternalLink,
  Dumbbell
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Exercise {
  id: string;
  name: string;
  category: string;
  difficulty: 'iniciante' | 'intermediario' | 'avancado';
  duration: string;
  description: string;
  instructions: string;
  targetMuscles: string[];
  equipment?: string[];
  video_url?: string;
  thumbnail_url?: string;
  youtube_url?: string;
  video_duration?: number;
}

interface ExerciseCardProps {
  exercise: Exercise;
  onView?: (exercise: Exercise) => void;
  onAddToPlan?: (exercise: Exercise) => void;
  isFavorite?: boolean;
  showPreview?: boolean;
  className?: string;
}

const difficultyConfig = {
  iniciante: { stars: 1, color: 'text-green-500', bg: 'bg-green-50' },
  intermediario: { stars: 3, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  avancado: { stars: 5, color: 'text-red-500', bg: 'bg-red-50' }
};

export function ExerciseCard({ 
  exercise, 
  onView, 
  onAddToPlan, 
  isFavorite = false,
  showPreview = true,
  className = '' 
}: ExerciseCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const difficulty = difficultyConfig[exercise.difficulty];
  const videoSource = exercise.youtube_url || exercise.video_url;
  const thumbnail = exercise.thumbnail_url || '/placeholder.svg';

  const handleToggleFavorite = async () => {
    if (!user) return;
    
    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        // Remover dos favoritos
        const { error } = await supabase
          .from('exercise_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('exercise_id', exercise.id);
        
        if (error) throw error;
        toast({ title: 'Removido dos favoritos' });
      } else {
        // Adicionar aos favoritos
        const { error } = await supabase
          .from('exercise_favorites')
          .insert({
            user_id: user.id,
            exercise_id: exercise.id
          });
        
        if (error) throw error;
        toast({ title: 'Adicionado aos favoritos' });
      }
    } catch (error) {
      console.error('Erro ao alterar favorito:', error);
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível alterar favorito',
        variant: 'destructive' 
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const formatDuration = (duration: string) => {
    return duration.includes('min') ? duration : `${duration} min`;
  };

  return (
    <Card 
      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 border-border/50 hover:border-primary/30 bg-gradient-to-br from-background to-muted/20 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail com overlay de play */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        <img 
          src={thumbnail}
          alt={exercise.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Overlay de play */}
        {videoSource && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button 
              size="sm" 
              className="bg-white/90 text-primary hover:bg-white"
              onClick={() => onView?.(exercise)}
            >
              <Play className="w-4 h-4 mr-1" />
              {exercise.video_duration ? `${Math.ceil(exercise.video_duration / 60)}min` : 'Play'}
            </Button>
          </div>
        )}

        {/* Badge de categoria */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs bg-background/90 backdrop-blur-sm">
            {exercise.category}
          </Badge>
        </div>

        {/* Botão de favorito */}
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 w-8 h-8 p-0 bg-background/90 backdrop-blur-sm hover:bg-background"
          onClick={handleToggleFavorite}
          disabled={favoriteLoading}
        >
          <Heart 
            className={`w-4 h-4 transition-colors ${
              isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground hover:text-red-500'
            }`} 
          />
        </Button>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
            {exercise.name}
          </CardTitle>
          
          {/* Ícone da área corporal */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>

        {/* Rating de dificuldade */}
        <div className="flex items-center gap-2">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`w-3 h-3 ${
                  i < difficulty.stars 
                    ? `${difficulty.color} fill-current` 
                    : 'text-muted-foreground/30'
                }`} 
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground capitalize">
            {exercise.difficulty}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Descrição */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {exercise.description}
        </p>

        {/* Músculos alvo */}
        <div className="flex flex-wrap gap-1">
          {exercise.targetMuscles.slice(0, 3).map((muscle) => (
            <Badge key={muscle} variant="outline" className="text-xs">
              {muscle}
            </Badge>
          ))}
          {exercise.targetMuscles.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{exercise.targetMuscles.length - 3}
            </Badge>
          )}
        </div>

        {/* Informações extras */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(exercise.duration)}
          </div>
          
          {exercise.equipment && exercise.equipment.length > 0 && (
            <div className="flex items-center gap-1">
              <span>{exercise.equipment[0]}</span>
              {exercise.equipment.length > 1 && (
                <span>+{exercise.equipment.length - 1}</span>
              )}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onView?.(exercise)}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Ver detalhes
          </Button>
          
          <Button 
            size="sm" 
            className="flex-1 bg-gradient-primary hover:opacity-90"
            onClick={() => onAddToPlan?.(exercise)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Adicionar
          </Button>
        </div>
      </CardContent>

      {/* Preview em hover (implementação futura) */}
      {showPreview && isHovered && videoSource && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 pointer-events-none">
          {/* Mini preview player - implementar depois */}
        </div>
      )}
    </Card>
  );
}