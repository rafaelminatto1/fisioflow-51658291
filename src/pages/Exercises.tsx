import { useState, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

  Plus, BookOpen, Target, FileText,
  Dumbbell, VideoOff, Video,
  Activity, Sparkles
} from 'lucide-react';
import { ExerciseLibrary } from '@/components/exercises/ExerciseLibrary';
import { TemplateManager } from '@/components/exercises/TemplateManager';
import { ProtocolsManager } from '@/components/exercises/ProtocolsManager';
import { ExerciseVideoLibrary } from '@/components/exercises/ExerciseVideoLibrary';
import { ExerciseVideoUpload } from '@/components/exercises/ExerciseVideoUpload';
import { NewExerciseModal } from '@/components/modals/NewExerciseModal';
import { ExerciseAI } from '@/components/ai/ExerciseAI';
import { ComponentErrorBoundary } from '@/components/error/ComponentErrorBoundary';
import { useExercises, type Exercise } from '@/hooks/useExercises';
import { useExerciseFavorites } from '@/hooks/useExerciseFavorites';
import { useExerciseProtocols } from '@/hooks/useExerciseProtocols';
import { useExerciseTemplates } from '@/hooks/useExerciseTemplates';
import { Skeleton } from '@/components/ui/skeleton';
import { fisioLogger as logger } from '@/lib/errors/logger';

export default function Exercises() {
  const { exercises, loading: loadingExercises, createExercise, updateExercise, isCreating, isUpdating } = useExercises();
  const { favorites } = useExerciseFavorites();
  const { protocols, loading: loadingProtocols } = useExerciseProtocols();
  const { templates, loading: loadingTemplates } = useExerciseTemplates();

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [activeTab, setActiveTab] = useState<'library' | 'videos' | 'templates' | 'protocols' | 'ai'>('library');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showVideoUpload, setShowVideoUpload] = useState(false);

  // Memoized computed values to prevent unnecessary recalculations
  const exercisesWithoutVideo = useMemo(() =>
    exercises.filter(ex => !ex.video_url),
    [exercises]
  );

  const exercisesWithVideo = useMemo(() =>
    exercises.filter(ex => ex.video_url),
    [exercises]
  );

  const videoPercentage = useMemo(() =>
    exercises.length > 0 ? Math.round((exercisesWithVideo.length / exercises.length) * 100) : 0,
    [exercises.length, exercisesWithVideo.length]
  );

  // Get unique categories - memoized
  const categories = useMemo(() =>
    Array.from(new Set(exercises.map(e => e.category).filter(Boolean))),
    [exercises]
  );

  const topCategories = useMemo(() =>
    categories.slice(0, 3),
    [categories]
  );

  // Memoized callbacks to prevent unnecessary re-renders
  const handleEditExercise = useCallback((exercise: Exercise) => {
    setEditingExercise(exercise);
    setShowNewModal(true);
  }, []);

  const handleNewExercise = useCallback(() => {
    setEditingExercise(null);
    setShowNewModal(true);
  }, []);

  const handleSubmit = useCallback((data: Omit<Exercise, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingExercise) {
      updateExercise({ id: editingExercise.id, ...data });
    } else {
      createExercise(data);
    }
    setShowNewModal(false);
    setEditingExercise(null);
  }, [editingExercise, updateExercise, createExercise]);

  const handleModalOpenChange = useCallback((open: boolean) => {
    setShowNewModal(open);
    if (!open) setEditingExercise(null);
  }, []);

  const handleVideoUploadOpenChange = useCallback((open: boolean) => {
    setShowVideoUpload(open);
  }, []);

  const handleTabChange = useCallback((v: string) => {
    setActiveTab(v as 'library' | 'videos' | 'templates' | 'protocols' | 'ai');
  }, []);

  const handleUploadClick = useCallback(() => {
    setShowVideoUpload(true);
  }, []);

  const isLoading = loadingExercises || loadingProtocols || loadingTemplates;

  return (
    <MainLayout>
      <div className="space-y-4 xs:space-y-6 pb-20 md:pb-0 animate-fade-in">
        {/* Hero Header - Mobile Optimized */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-4 sm:p-6 lg:p-8">
          <div className="absolute top-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-48 sm:h-48 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col gap-4 flex-1">
              {/* Title and Icon */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
                  <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                    Biblioteca de Exercícios
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                    Gerencie exercícios, templates e protocolos de tratamento
                  </p>
                </div>
              </div>

              {/* Categories - Hidden on smallest mobile, shown on xs+ */}
              {!isLoading && topCategories.length > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Categorias:</span>
                  {topCategories.map(cat => (
                    <Badge key={cat} variant="secondary" className="text-[10px] sm:text-xs bg-background/50 backdrop-blur">
                      {cat}
                    </Badge>
                  ))}
                  {categories.length > 3 && (
                    <Badge variant="outline" className="text-[10px] sm:text-xs">
                      +{categories.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons - Full width on mobile */}
            <div className="flex gap-2 w-full lg:w-auto">
              <Button
                onClick={handleNewExercise}
                size="default"
                className="flex-1 lg:flex-auto shadow-lg shadow-primary/20 gap-2 group touch-target"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:rotate-90" />
                <span>Novo Exercício</span>
              </Button>
              <Button
                onClick={handleUploadClick}
                variant="outline"
                size="default"
                className="flex-1 lg:flex-auto gap-2 touch-target"
              >
                <Video className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Upload Vídeo</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid - Mobile Optimized */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-3">
                  <Skeleton className="h-8 w-8 rounded-xl mb-2" />
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-6 w-12" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              {/* Total Exercises */}
              <Card className="group overflow-hidden hover:shadow-lg transition-all hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between">
                    <div className="p-1.5 sm:p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Dumbbell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{exercises.length}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Exercícios</p>
                  </div>
                </CardContent>
              </Card>

              {/* Video Coverage */}
              <Card className="group overflow-hidden hover:shadow-lg transition-all hover:border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-background">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between">
                    <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                      <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
                    </div>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                      {videoPercentage}%
                    </Badge>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-600">{exercisesWithVideo.length}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Com vídeo</p>
                    <Progress value={videoPercentage} className="h-1 mt-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Templates */}
              <Card className="group overflow-hidden hover:shadow-lg transition-all hover:border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-background">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between">
                    <div className="p-1.5 sm:p-2 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                      <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">{templates.length}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Templates</p>
                  </div>
                </CardContent>
              </Card>

              {/* Protocols - Hidden on small mobile, shown on sm+ */}
              <Card className="group overflow-hidden hover:shadow-lg transition-all hover:border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-background hidden sm:block">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between">
                    <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                      <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-600">{protocols.length}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Protocolos</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Alert for exercises without video - Mobile Optimized */}
        {!isLoading && exercisesWithoutVideo.length > 0 && (
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-xl bg-orange-500/10 flex-shrink-0">
                <VideoOff className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-orange-800 dark:text-orange-200 text-sm sm:text-base">
                  {exercisesWithoutVideo.length} sem vídeo
                </p>
                <p className="text-xs sm:text-sm text-orange-700/80 dark:text-orange-300/80 truncate">
                  Adicione vídeos demonstrativos para melhorar a experiência
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 flex-shrink-0 touch-target h-8 sm:h-9"
                onClick={() => handleTabChange('library')}
              >
                Ver
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs - Mobile Optimized */}
        <Card className="overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="border-b bg-muted/30">
              <TabsList className="w-full justify-start rounded-none border-0 bg-transparent h-12 sm:h-14 p-0">
                <TabsTrigger
                  value="library"
                  className="gap-1.5 sm:gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 md:px-6 text-xs sm:text-sm"
                >
                  <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Biblioteca</span>
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 h-4 sm:h-5 text-[10px] sm:text-xs">
                    {exercises.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="videos"
                  className="gap-1.5 sm:gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 md:px-6 text-xs sm:text-sm"
                >
                  <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Vídeos</span>
                </TabsTrigger>
                <TabsTrigger
                  value="templates"
                  className="gap-1.5 sm:gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 md:px-6 text-xs sm:text-sm"
                >
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Templates</span>
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 h-4 sm:h-5 text-[10px] sm:text-xs">
                    {templates.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="protocols"
                  className="gap-1.5 sm:gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 md:px-6 text-xs sm:text-sm"
                >
                  <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Protocolos</span>
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 h-4 sm:h-5 text-[10px] sm:text-xs">
                    {protocols.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="ai"
                  className="gap-1.5 sm:gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 md:px-6 text-xs sm:text-sm bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20"
                >
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
                  <span className="hidden xs:inline">IA Assistente</span>
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 h-4 sm:h-5 text-[10px] sm:text-xs bg-purple-500/20 text-purple-600">
                    NOVO
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="library" className="m-0 p-3 sm:p-4 md:p-6">
              <ComponentErrorBoundary componentName="ExerciseLibrary">
                <ExerciseLibrary onEditExercise={handleEditExercise} />
              </ComponentErrorBoundary>
            </TabsContent>

            <TabsContent value="videos" className="m-0 p-3 sm:p-4 md:p-6">
              <ComponentErrorBoundary componentName="ExerciseVideoLibrary">
                <ExerciseVideoLibrary onUploadClick={handleUploadClick} />
              </ComponentErrorBoundary>
            </TabsContent>

            <TabsContent value="templates" className="m-0 p-3 sm:p-4 md:p-6">
              <ComponentErrorBoundary componentName="TemplateManager">
                <TemplateManager />
              </ComponentErrorBoundary>
            </TabsContent>

            <TabsContent value="protocols" className="m-0 p-3 sm:p-4 md:p-6">
              <ComponentErrorBoundary componentName="ProtocolsManager">
                <ProtocolsManager />
              </ComponentErrorBoundary>
            </TabsContent>

            <TabsContent value="ai" className="m-0 p-0 sm:p-0">
              <ComponentErrorBoundary componentName="ExerciseAI">
              <ExerciseAI
                exerciseLibrary={exercises}
                onExerciseSelect={(selectedExercises) => {
                  logger.debug('Exercises selected', { selectedExercises }, 'Exercises');
                }}
              />
              </ComponentErrorBoundary>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <NewExerciseModal
        open={showNewModal}
        onOpenChange={handleModalOpenChange}
        onSubmit={handleSubmit}
        exercise={editingExercise || undefined}
        isLoading={isCreating || isUpdating}
      />

      <ExerciseVideoUpload
        open={showVideoUpload}
        onOpenChange={handleVideoUploadOpenChange}
        onSuccess={() => {
          // Invalidate queries to refresh video list
        }}
      />
    </MainLayout>
  );
}
