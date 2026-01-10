import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Plus, BookOpen, Target, FileText, Heart,
  Dumbbell, VideoOff, Sparkles, TrendingUp,
  Activity, Zap, ArrowRight, LayoutDashboard
} from 'lucide-react';
import { ExerciseLibrary } from '@/components/exercises/ExerciseLibrary';
import { TemplateManager } from '@/components/exercises/TemplateManager';
import { ProtocolsManager } from '@/components/exercises/ProtocolsManager';
import { NewExerciseModal } from '@/components/modals/NewExerciseModal';
import { useExercises, type Exercise } from '@/hooks/useExercises';
import { useExerciseFavorites } from '@/hooks/useExerciseFavorites';
import { useExerciseProtocols } from '@/hooks/useExerciseProtocols';
import { useExerciseTemplates } from '@/hooks/useExerciseTemplates';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function Exercises() {
  const { exercises, loading: loadingExercises, createExercise, updateExercise, isCreating, isUpdating } = useExercises();
  const { favorites } = useExerciseFavorites();
  const { protocols, loading: loadingProtocols } = useExerciseProtocols();
  const { templates, loading: loadingTemplates } = useExerciseTemplates();

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [activeTab, setActiveTab] = useState<'library' | 'templates' | 'protocols'>('library');
  const [showNewModal, setShowNewModal] = useState(false);

  const exercisesWithoutVideo = exercises.filter(ex => !ex.video_url);
  const exercisesWithVideo = exercises.filter(ex => ex.video_url);
  const videoPercentage = exercises.length > 0 ? Math.round((exercisesWithVideo.length / exercises.length) * 100) : 0;

  // Get unique categories
  const categories = Array.from(new Set(exercises.map(e => e.category).filter(Boolean)));
  const topCategories = categories.slice(0, 5);

  const handleEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setShowNewModal(true);
  };

  const handleNewExercise = () => {
    setEditingExercise(null);
    setShowNewModal(true);
  };

  const handleSubmit = (data: Omit<Exercise, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingExercise) {
      updateExercise({ id: editingExercise.id, ...data });
    } else {
      createExercise(data);
    }
    setShowNewModal(false);
    setEditingExercise(null);
  };

  const isLoading = loadingExercises || loadingProtocols || loadingTemplates;

  return (
    <MainLayout>
      <div className="space-y-6 pb-20 md:pb-0 animate-fade-in">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Biblioteca de Exercícios
                  </h1>
                  <p className="text-muted-foreground">
                    Gerencie exercícios, templates e protocolos de tratamento
                  </p>
                </div>
              </div>

              {/* Quick Categories */}
              {!isLoading && topCategories.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Categorias:</span>
                  {topCategories.map(cat => (
                    <Badge key={cat} variant="secondary" className="text-xs bg-background/50 backdrop-blur">
                      {cat}
                    </Badge>
                  ))}
                  {categories.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{categories.length - 5}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <Button onClick={handleNewExercise} size="lg" className="shadow-lg shadow-primary/20 gap-2 group">
              <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
              Novo Exercício
              <ArrowRight className="h-4 w-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4">
                  <Skeleton className="h-12 w-12 rounded-xl mb-3" />
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              {/* Total Exercises */}
              <Card className="group overflow-hidden hover:shadow-lg transition-all hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Dumbbell className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                      <Activity className="h-3 w-3 mr-1" />
                      Total
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl sm:text-4xl font-bold">{exercises.length}</p>
                    <p className="text-sm text-muted-foreground mt-1">Exercícios cadastrados</p>
                  </div>
                </CardContent>
              </Card>

              {/* Video Coverage */}
              <Card className="group overflow-hidden hover:shadow-lg transition-all hover:border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-background">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                      <Sparkles className="h-5 w-5 text-emerald-600" />
                    </div>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-xs">
                      {videoPercentage}%
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl sm:text-4xl font-bold text-emerald-600">{exercisesWithVideo.length}</p>
                    <p className="text-sm text-muted-foreground mt-1">Com vídeo demonstrativo</p>
                    <Progress value={videoPercentage} className="h-1.5 mt-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Favorites */}
              <Card className="group overflow-hidden hover:shadow-lg transition-all hover:border-rose-500/30 bg-gradient-to-br from-rose-500/5 to-background">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
                      <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
                    </div>
                    <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Favoritos
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl sm:text-4xl font-bold text-rose-600">{favorites.length}</p>
                    <p className="text-sm text-muted-foreground mt-1">Exercícios favoritos</p>
                  </div>
                </CardContent>
              </Card>

              {/* Protocols */}
              <Card className="group overflow-hidden hover:shadow-lg transition-all hover:border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-background">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                      <Target className="h-5 w-5 text-amber-600" />
                    </div>
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Protocolos
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl sm:text-4xl font-bold text-amber-600">{protocols.length}</p>
                    <p className="text-sm text-muted-foreground mt-1">Protocolos ativos</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Alert for exercises without video */}
        {!isLoading && exercisesWithoutVideo.length > 0 && (
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-500/10">
                <VideoOff className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  {exercisesWithoutVideo.length} exercício{exercisesWithoutVideo.length !== 1 ? 's' : ''} sem vídeo
                </p>
                <p className="text-sm text-orange-700/80 dark:text-orange-300/80">
                  Adicione vídeos demonstrativos para melhorar a experiência dos pacientes
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10"
                onClick={() => setActiveTab('library')}
              >
                Revisar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Card className="overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <div className="border-b bg-muted/30">
              <TabsList className="w-full justify-start rounded-none border-0 bg-transparent h-14 p-0">
                <TabsTrigger
                  value="library"
                  className="gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Biblioteca</span>
                  <Badge variant="secondary" className="ml-1 h-5 text-xs">
                    {exercises.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="templates"
                  className="gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6"
                >
                  <FileText className="h-4 w-4" />
                  <span>Templates</span>
                  <Badge variant="secondary" className="ml-1 h-5 text-xs">
                    {templates.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="protocols"
                  className="gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6"
                >
                  <Target className="h-4 w-4" />
                  <span>Protocolos</span>
                  <Badge variant="secondary" className="ml-1 h-5 text-xs">
                    {protocols.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="library" className="m-0 p-4 sm:p-6">
              <ExerciseLibrary onEditExercise={handleEditExercise} />
            </TabsContent>

            <TabsContent value="templates" className="m-0 p-4 sm:p-6">
              <TemplateManager />
            </TabsContent>

            <TabsContent value="protocols" className="m-0 p-4 sm:p-6">
              <ProtocolsManager />
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <NewExerciseModal
        open={showNewModal}
        onOpenChange={(open) => {
          setShowNewModal(open);
          if (!open) setEditingExercise(null);
        }}
        onSubmit={handleSubmit}
        exercise={editingExercise || undefined}
        isLoading={isCreating || isUpdating}
      />
    </MainLayout>
  );
}
