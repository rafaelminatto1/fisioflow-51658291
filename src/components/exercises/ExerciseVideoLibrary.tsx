import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, Video, Upload, Trash2, Edit, Eye, Play,
  Filter, X, Clock
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useExerciseVideos, useDeleteExerciseVideo } from '@/hooks/useExerciseVideos';
import { ExerciseVideoPlayer } from './ExerciseVideoPlayerCard';
import { ExerciseVideoUpload } from './ExerciseVideoUpload';
import { EmptyState } from '@/components/ui/empty-state';
import { VIDEO_CATEGORIES, VIDEO_DIFFICULTY, BODY_PARTS, EQUIPMENT_OPTIONS } from '@/services/exerciseVideos';
import { toast } from '@/hooks/use-toast';

interface ExerciseVideoLibraryProps {
  onUploadClick?: () => void;
}

export function ExerciseVideoLibrary({ onUploadClick }: ExerciseVideoLibraryProps) {
  const { data: videos, isLoading } = useExerciseVideos();
  const deleteVideoMutation = useDeleteExerciseVideo();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [bodyPartFilter, setBodyPartFilter] = useState<string>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<(typeof videos)[0] | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredVideos = React.useMemo(() => {
    if (!videos) return [];

    return videos.filter((video) => {
      const matchesSearch =
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (video.description?.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;
      if (categoryFilter !== 'all' && video.category !== categoryFilter) return false;
      if (difficultyFilter !== 'all' && video.difficulty !== difficultyFilter) return false;
      if (bodyPartFilter !== 'all' && !video.body_parts?.includes(bodyPartFilter)) return false;
      if (equipmentFilter !== 'all' && !video.equipment?.includes(equipmentFilter)) return false;

      return true;
    });
  }, [videos, searchTerm, categoryFilter, difficultyFilter, bodyPartFilter, equipmentFilter]);

  const hasActiveFilters =
    categoryFilter !== 'all' ||
    difficultyFilter !== 'all' ||
    bodyPartFilter !== 'all' ||
    equipmentFilter !== 'all' ||
    searchTerm.length > 0;

  const clearFilters = () => {
    setCategoryFilter('all');
    setDifficultyFilter('all');
    setBodyPartFilter('all');
    setEquipmentFilter('all');
    setSearchTerm('');
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteVideoMutation.mutateAsync(deleteId);
      setDeleteId(null);
      toast({
        title: 'Vídeo excluído',
        description: 'O vídeo foi removido da biblioteca.',
      });
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Biblioteca de Vídeos</h2>
          <p className="text-sm text-muted-foreground">
            {filteredVideos.length} vídeo{filteredVideos.length !== 1 ? 's' : ''}
            {hasActiveFilters && ` de ${videos?.length || 0}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <Filter className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          </Button>
          <Button onClick={() => setShowUpload(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Vídeo
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar vídeos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              {VIDEO_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Dificuldade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Dificuldades</SelectItem>
              {VIDEO_DIFFICULTY.map((diff) => (
                <SelectItem key={diff} value={diff}>
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={bodyPartFilter} onValueChange={setBodyPartFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Parte do Corpo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Partes</SelectItem>
              {BODY_PARTS.map((part) => (
                <SelectItem key={part} value={part}>
                  {part.charAt(0).toUpperCase() + part.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Equipamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Equipamentos</SelectItem>
              {EQUIPMENT_OPTIONS.map((eq) => (
                <SelectItem key={eq} value={eq}>
                  {eq.charAt(0).toUpperCase() + eq.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
              <X className="h-3 w-3" />
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* Video Grid/List */}
      {filteredVideos.length === 0 ? (
        <EmptyState
          icon={Video}
          title={hasActiveFilters ? 'Nenhum vídeo encontrado' : 'Nenhum vídeo ainda'}
          description={
            hasActiveFilters
              ? 'Tente ajustar seus filtros de busca'
              : 'Comece adicionando vídeos demonstrativos de exercícios'
          }
        >
          {!hasActiveFilters && (
            <Button onClick={() => setShowUpload(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Primeiro Vídeo
            </Button>
          )}
        </EmptyState>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onPlay={() => setSelectedVideo(video)}
              onDelete={() => setDeleteId(video.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredVideos.map((video) => (
            <VideoListItem
              key={video.id}
              video={video}
              onPlay={() => setSelectedVideo(video)}
              onDelete={() => setDeleteId(video.id)}
            />
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="space-y-4">
              <ExerciseVideoPlayer
                src={selectedVideo.video_url}
                thumbnail={selectedVideo.thumbnail_url}
                title={selectedVideo.title}
              />
              <div className="space-y-2">
                {selectedVideo.description && (
                  <p className="text-sm text-muted-foreground">{selectedVideo.description}</p>
                )}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {selectedVideo.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(selectedVideo.duration)}
                    </span>
                  )}
                  <span>• {formatFileSize(selectedVideo.file_size)}</span>
                  <span>•</span>
                  <Badge variant="outline" className="capitalize">
                    {selectedVideo.category}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {selectedVideo.difficulty}
                  </Badge>
                </div>
                {selectedVideo.body_parts && selectedVideo.body_parts.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedVideo.body_parts.map((part) => (
                      <Badge key={part} variant="secondary" className="text-xs capitalize">
                        {part}
                      </Badge>
                    ))}
                  </div>
                )}
                {selectedVideo.equipment && selectedVideo.equipment.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedVideo.equipment.map((eq) => (
                      <Badge key={eq} variant="outline" className="text-xs capitalize">
                        {eq}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir vídeo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O vídeo será removido permanentemente da biblioteca.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteVideoMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Modal */}
      <ExerciseVideoUpload
        open={showUpload}
        onOpenChange={setShowUpload}
        onSuccess={() => {
          setShowUpload(false);
        }}
      />
    </div>
  );
}

// Video Card Component
function VideoCard({
  video,
  onPlay,
  onDelete
}: {
  video: (typeof filteredVideos)[0];
  onPlay: () => void;
  onDelete: () => void;
}) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card hover:shadow-lg transition-all">
      {/* Thumbnail with overlay */}
      <div className="relative aspect-video bg-muted">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <Video className="h-12 w-12 text-primary/30" />
          </div>
        )}

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs font-medium">
            {formatDuration(video.duration)}
          </div>
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            onClick={onPlay}
            className="w-14 h-14 rounded-full bg-white/90 hover:bg-white"
          >
            <Play className="h-6 w-6 fill-black text-black ml-1" />
          </Button>
        </div>

        {/* Category badge */}
        <div className="absolute top-2 left-2">
          <Badge className="bg-primary/90 text-white text-xs capitalize">
            {video.category}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-1">{video.title}</h3>
        {video.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{video.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <Badge variant="outline" className="text-xs capitalize">
            {video.difficulty}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Video List Item Component
function VideoListItem({
  video,
  onPlay,
  onDelete
}: {
  video: (typeof filteredVideos)[0];
  onPlay: () => void;
  onDelete: () => void;
}) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="group flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      {/* Thumbnail */}
      <div className="relative w-32 h-20 flex-shrink-0 rounded overflow-hidden bg-muted">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="h-8 w-8 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" onClick={onPlay} className="w-8 h-8 rounded-full bg-white/90">
            <Play className="h-4 w-4 fill-black text-black ml-0.5" />
          </Button>
        </div>
        {video.duration && (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px]">
            {formatDuration(video.duration)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{video.title}</h4>
        {video.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{video.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs capitalize">
            {video.category}
          </Badge>
          <Badge variant="outline" className="text-xs Capitalize">
            {video.difficulty}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onPlay}>
          <Play className="h-4 w-4 mr-1" />
          Assistir
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
