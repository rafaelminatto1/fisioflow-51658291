import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ExerciseVideoPlayer } from '@/components/exercises/ExerciseVideoPlayer';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Search, Dumbbell, Filter } from 'lucide-react';

interface Exercise {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  difficulty: 'iniciante' | 'intermediario' | 'avancado';
  category: string;
  targetMuscles: string[];
  instructions: string[];
}

const ExerciseLibraryExpanded = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const exercises = [
    {
      id: '1',
      title: 'Alongamento Lombar',
      description: 'Exercício para alívio de dor lombar e melhora da flexibilidade',
      videoUrl: 'https://example.com/video1.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800',
      duration: '5 min',
      difficulty: 'iniciante' as const,
      category: 'Alongamento',
      targetMuscles: ['Lombar', 'Glúteos', 'Isquiotibiais'],
      instructions: [
        'Deite-se de costas com os joelhos flexionados',
        'Puxe um joelho em direção ao peito',
        'Mantenha por 30 segundos',
        'Repita com a outra perna',
        'Faça 3 séries para cada lado'
      ]
    },
    {
      id: '2',
      title: 'Fortalecimento Core',
      description: 'Exercício para fortalecimento da musculatura abdominal e estabilização',
      videoUrl: 'https://example.com/video2.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800',
      duration: '8 min',
      difficulty: 'intermediario' as const,
      category: 'Fortalecimento',
      targetMuscles: ['Abdômen', 'Oblíquos', 'Transverso'],
      instructions: [
        'Posição de prancha apoiado nos antebraços',
        'Mantenha o corpo alinhado',
        'Contraia o abdômen',
        'Segure por 30 segundos',
        'Descanse e repita 3 vezes'
      ]
    },
    {
      id: '3',
      title: 'Mobilidade de Ombro',
      description: 'Exercício para aumentar amplitude de movimento dos ombros',
      videoUrl: 'https://example.com/video3.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      duration: '6 min',
      difficulty: 'iniciante' as const,
      category: 'Mobilidade',
      targetMuscles: ['Deltóide', 'Manguito Rotador', 'Trapézio'],
      instructions: [
        'Fique em pé com os pés afastados',
        'Eleve os braços lateralmente até a altura dos ombros',
        'Faça círculos pequenos para frente',
        'Depois faça círculos para trás',
        'Repita 10 vezes cada direção'
      ]
    }
  ];

  const filteredExercises = exercises.filter(ex =>
    ex.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedExercise) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-fade-in">
          <Button variant="outline" onClick={() => setSelectedExercise(null)}>
            ← Voltar para Biblioteca
          </Button>
          <ExerciseVideoPlayer 
            exercise={selectedExercise}
            onComplete={() => setSelectedExercise(null)}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary grid place-items-center shadow-medical">
            <Dumbbell className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Biblioteca de Exercícios</h1>
            <p className="text-muted-foreground">
              Vídeos e instruções detalhadas para cada exercício
            </p>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar exercícios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>

        {/* Grade de Exercícios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExercises.map((exercise) => (
            <Card 
              key={exercise.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedExercise(exercise)}
            >
              <CardContent className="p-0">
                <div className="relative h-48 overflow-hidden rounded-t-lg">
                  <img 
                    src={exercise.thumbnailUrl}
                    alt={exercise.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary">{exercise.duration}</Badge>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-lg">{exercise.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {exercise.description}
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline">{exercise.category}</Badge>
                    <Badge variant="outline">{exercise.difficulty}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default ExerciseLibraryExpanded;
