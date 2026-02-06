import React, { useState, useCallback, useEffect, memo } from 'react';
import { useDebounce } from '@/hooks/performance/useDebounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

  Search, Video, Upload, Trash2, Play,
  X, Clock, Edit, AlertCircle, Check,
  Download, ListVideo, ChevronRight, ChevronLeft,
  Square, MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useExerciseVideos, useDeleteExerciseVideo, useUpdateExerciseVideo } from '@/hooks/useExerciseVideos';
import { ExerciseVideoPlayer } from './ExerciseVideoPlayerCard';
import { ExerciseVideoUpload } from './ExerciseVideoUpload';
import { EmptyState } from '@/components/ui/empty-state';
import {
  VIDEO_CATEGORIES,
  VIDEO_DIFFICULTY,
  BODY_PARTS,
  EQUIPMENT_OPTIONS,
  exerciseVideosService,
  type ExerciseVideo
} from '@/services/exerciseVideos';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ExerciseVideoLibraryProps {
  onUploadClick?: () => void;
}

export function ExerciseVideoLibrary({ onUploadClick: _onUploadClick }: ExerciseVideoLibraryProps) {
  const { data: videos, isLoading, error } = useExerciseVideos();
  const deleteVideoMutation = useDeleteExerciseVideo();
  const updateVideoMutation = useUpdateExerciseVideo();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [bodyPartFilter, setBodyPartFilter] = useState<string>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<ExerciseVideo | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingVideo, setEditingVideo] = useState<ExerciseVideo | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);

  // Playlist state
  const [playlist, setPlaylist] = useState<ExerciseVideo[]>([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDifficulty, setEditDifficulty] = useState('');
  const [editBodyParts, setEditBodyParts] = useState<string[]>([]);
  const [editEquipment, setEditEquipment] = useState<string[]>([]);

  const filteredVideos = React.useMemo(() => {
    if (!videos) return [];

    return videos.filter((video) => {
      const matchesSearch =
        video.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (video.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));

      if (!matchesSearch) return false;
      if (categoryFilter !== 'all' && video.category !== categoryFilter) return false;
      if (difficultyFilter !== 'all' && video.difficulty !== difficultyFilter) return false;
      if (bodyPartFilter !== 'all' && !video.body_parts?.includes(bodyPartFilter)) return false;
      if (equipmentFilter !== 'all' && !video.equipment?.includes(equipmentFilter)) return false;

      return true;
    });
  }, [videos, debouncedSearchTerm, categoryFilter, difficultyFilter, bodyPartFilter, equipmentFilter]);

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

  // Open edit modal with video data
  const handleOpenEdit = useCallback((video: ExerciseVideo) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDescription(video.description || '');
    setEditCategory(video.category);
    setEditDifficulty(video.difficulty);
    setEditBodyParts(video.body_parts || []);
    setEditEquipment(video.equipment || []);
    setShowEdit(true);
  }, []);

  // Close edit modal
  const handleCloseEdit = useCallback(() => {
    setShowEdit(false);
    setEditingVideo(null);
    setEditTitle('');
    setEditDescription('');
    setEditCategory('');
    setEditDifficulty('');
    setEditBodyParts([]);
    setEditEquipment([]);
  }, []);

  // Save video edits
  const handleSaveEdit = useCallback(async () => {
    if (!editingVideo) return;

    if (editTitle.trim().length < 3) {
      toast({
        title: 'Título muito curto',
        description: 'O título deve ter pelo menos 3 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateVideoMutation.mutateAsync({
        id: editingVideo.id,
        updates: {
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          category: editCategory as string,
          difficulty: editDifficulty as string,
          body_parts: editBodyParts,
          equipment: editEquipment,
        },
      });

      toast({
        title: 'Vídeo atualizado',
        description: 'As informações do vídeo foram atualizadas.',
      });

      handleCloseEdit();

      // Update selected video if it's currently open
      if (selectedVideo?.id === editingVideo.id) {
        setSelectedVideo({
          ...selectedVideo,
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          category: editCategory as string,
          difficulty: editDifficulty as string,
          body_parts: editBodyParts,
          equipment: editEquipment,
        });
      }
    } catch {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o vídeo. Tente novamente.',
        variant: 'destructive',
      });
    }
  }, [editingVideo, editTitle, editDescription, editCategory, editDifficulty, editBodyParts, editEquipment, updateVideoMutation, selectedVideo, handleCloseEdit]);

  // Bulk selection handlers
  const toggleSelectVideo = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const exitBulkMode = useCallback(() => {
    setIsBulkMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleEditBodyPart = useCallback((part: string) => {
    setEditBodyParts((prev) =>
      prev.includes(part)
        ? prev.filter((p) => p !== part)
        : [...prev, part]
    );
  }, []);

  const toggleEditEquipment = useCallback((eq: string) => {
    setEditEquipment((prev) =>
      prev.includes(eq)
        ? prev.filter((e) => e !== eq)
        : [...prev, eq]
    );
  }, []);

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteVideoMutation.mutateAsync(deleteId);
        setDeleteId(null);
        toast({
          title: 'Vídeo excluído',
          description: 'O vídeo foi removido da biblioteca.',
        });
      } catch {
        toast({
          title: 'Erro ao excluir',
          description: 'Não foi possível excluir o vídeo. Tente novamente.',
          variant: 'destructive',
        });
      }
    }
  };

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredVideos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVideos.map(v => v.id)));
    }
  }, [selectedIds.size, filteredVideos]);

  // Keyboard shortcuts - ESC to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showEdit) {
          handleCloseEdit();
        } else if (selectedVideo) {
          setSelectedVideo(null);
          setShowPlaylist(false);
        } else if (deleteId) {
          setDeleteId(null);
        } else if (showUpload) {
          setShowUpload(false);
        } else if (isBulkMode) {
          exitBulkMode();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showEdit, selectedVideo, deleteId, showUpload, handleCloseEdit, isBulkMode, exitBulkMode]);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const idsToDelete = Array.from(selectedIds);
    setDeleteIds(idsToDelete);

    try {
      await Promise.all(idsToDelete.map(id => deleteVideoMutation.mutateAsync(id)));
      toast({
        title: 'Vídeos excluídos',
        description: `${idsToDelete.length} vídeo(s) removido(s) da biblioteca.`,
      });
      exitBulkMode();
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Alguns vídeos não puderam ser excluídos. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setDeleteIds([]);
    }
  };

  const handlePlayPlaylist = useCallback((video: ExerciseVideo) => {
    const currentIndex = filteredVideos.findIndex(v => v.id === video.id);
    setPlaylist(filteredVideos);
    setCurrentPlaylistIndex(currentIndex);
    setShowPlaylist(true);
    setSelectedVideo(video);
  }, [filteredVideos]);

  const playNext = useCallback(() => {
    if (currentPlaylistIndex < playlist.length - 1) {
      const nextIndex = currentPlaylistIndex + 1;
      setCurrentPlaylistIndex(nextIndex);
      setSelectedVideo(playlist[nextIndex]);
    }
  }, [currentPlaylistIndex, playlist]);

  const playPrevious = useCallback(() => {
    if (currentPlaylistIndex > 0) {
      const prevIndex = currentPlaylistIndex - 1;
      setCurrentPlaylistIndex(prevIndex);
      setSelectedVideo(playlist[prevIndex]);
    }
  }, [currentPlaylistIndex, playlist]);

  const downloadVideo = useCallback(async (video: ExerciseVideo) => {
    try {
      const response = await fetch(video.video_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${video.title}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: 'Download iniciado',
        description: 'O vídeo está sendo baixado.',
      });
    } catch {
      toast({
        title: 'Erro ao baixar',
        description: 'Não foi possível baixar o vídeo.',
        variant: 'destructive',
      });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar vídeos</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Não foi possível carregar a biblioteca de vídeos. Tente novamente.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Recarregar
        </Button>
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
          {isBulkMode ? (
            <>
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedIds.size === filteredVideos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || deleteIds.length > 0}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Excluir ({selectedIds.size})
              </Button>
              <Button variant="outline" size="sm" onClick={exitBulkMode}>
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsBulkMode(true)}
                title="Modo de seleção"
              >
                <Square className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <ListVideo className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </Button>
              <Button onClick={() => setShowUpload(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Vídeo
              </Button>
            </>
          )}
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
              onPlayPlaylist={() => handlePlayPlaylist(video)}
              onDelete={() => setDeleteId(video.id)}
              onEdit={() => handleOpenEdit(video)}
              onDownload={() => downloadVideo(video)}
              isBulkMode={isBulkMode}
              isSelected={selectedIds.has(video.id)}
              onToggleSelect={() => toggleSelectVideo(video.id)}
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
              onPlayPlaylist={() => handlePlayPlaylist(video)}
              onDelete={() => setDeleteId(video.id)}
              onEdit={() => handleOpenEdit(video)}
              onDownload={() => downloadVideo(video)}
              isBulkMode={isBulkMode}
              isSelected={selectedIds.has(video.id)}
              onToggleSelect={() => toggleSelectVideo(video.id)}
            />
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => {
        if (!open) {
          setSelectedVideo(null);
          setShowPlaylist(false);
        }
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex-1 pr-4">{selectedVideo?.title}</DialogTitle>
              {showPlaylist && playlist.length > 1 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={playPrevious} disabled={currentPlaylistIndex === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span>{currentPlaylistIndex + 1} / {playlist.length}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={playNext} disabled={currentPlaylistIndex === playlist.length - 1}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {selectedVideo && (
            <div className="space-y-4">
              <ExerciseVideoPlayer
                src={selectedVideo.video_url}
                thumbnail={selectedVideo.thumbnail_url}
                title={selectedVideo.title}
                onEnded={showPlaylist ? playNext : undefined}
              />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    {selectedVideo.description && (
                      <p className="text-sm text-muted-foreground">{selectedVideo.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {selectedVideo.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {exerciseVideosService.formatDuration(selectedVideo.duration)}
                        </span>
                      )}
                      <span>• {exerciseVideosService.formatFileSize(selectedVideo.file_size)}</span>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => downloadVideo(selectedVideo)}>
                        <Download className="h-4 w-4 mr-2" />
                        Baixar Vídeo
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        handleOpenEdit(selectedVideo);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteId(selectedVideo.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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

      {/* Edit Video Modal */}
      <Dialog open={showEdit} onOpenChange={handleCloseEdit}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Vídeo</DialogTitle>
            <DialogDescription>
              Atualize as informações do vídeo de exercício
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label>
                Título do Exercício <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Ex: Rotação de Ombro com Bastão"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground text-right">
                {editTitle.length}/100 caracteres
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o exercício, objetivo e cuidados importantes..."
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {editDescription.length}/500 caracteres
              </p>
            </div>

            {/* Category and Difficulty */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Categoria <span className="text-destructive">*</span>
                </Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Dificuldade <span className="text-destructive">*</span>
                </Label>
                <Select value={editDifficulty} onValueChange={setEditDifficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_DIFFICULTY.map((diff) => (
                      <SelectItem key={diff} value={diff}>
                        {diff.charAt(0).toUpperCase() + diff.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Body Parts */}
            <div className="space-y-2">
              <Label>Partes do Corpo</Label>
              <div className="flex flex-wrap gap-2">
                {BODY_PARTS.map((part) => (
                  <Badge
                    key={part}
                    variant={editBodyParts.includes(part) ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-primary/20',
                      editBodyParts.includes(part) && 'bg-primary text-primary-foreground hover:bg-primary'
                    )}
                    onClick={() => toggleEditBodyPart(part)}
                  >
                    {part.charAt(0).toUpperCase() + part.slice(1)}
                    {editBodyParts.includes(part) && (
                      <Check className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div className="space-y-2">
              <Label>Equipamentos Necessários</Label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <Badge
                    key={eq}
                    variant={editEquipment.includes(eq) ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-primary/20',
                      editEquipment.includes(eq) && 'bg-primary text-primary-foreground hover:bg-primary'
                    )}
                    onClick={() => toggleEditEquipment(eq)}
                  >
                    {eq.charAt(0).toUpperCase() + eq.slice(1)}
                    {editEquipment.includes(eq) && (
                      <Check className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseEdit}
              disabled={updateVideoMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={editTitle.trim().length < 3 || updateVideoMutation.isPending}
            >
              {updateVideoMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
  onPlayPlaylist,
  onDelete,
  onEdit,
  onDownload,
  isBulkMode,
  isSelected,
  onToggleSelect,
}: {
  video: ExerciseVideo;
  onPlay: () => void;
  onPlayPlaylist?: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onDownload?: () => void;
  isBulkMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const handleCardClick = (e: React.MouseEvent) => {
    if (isBulkMode) {
      onToggleSelect();
    } else if ((e.target as HTMLElement).closest('button')) {
      // Allow button clicks to pass through
      return;
    } else {
      onPlay();
    }
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border bg-card hover:shadow-lg transition-all',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={handleCardClick}
    >
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

        {/* Selection checkbox for bulk mode */}
        {isBulkMode && (
          <div className="absolute top-2 left-2 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect();
              }}
              className={cn(
                'w-6 h-6 rounded border-2 flex items-center justify-center transition-colors',
                isSelected
                  ? 'bg-primary border-primary'
                  : 'bg-white/80 border-white hover:bg-white'
              )}
            >
              {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
            </button>
          </div>
        )}

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs font-medium">
            {exerciseVideosService.formatDuration(video.duration)}
          </div>
        )}

        {/* Play button overlay */}
        {!isBulkMode && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
              }}
              className="w-14 h-14 rounded-full bg-white/90 hover:bg-white"
              aria-label={`Reproduzir ${video.title}`}
            >
              <Play className="h-6 w-6 fill-black text-black ml-1" />
            </Button>
          </div>
        )}

        {/* Category badge */}
        <div className={cn('absolute top-2', isBulkMode ? 'left-10' : 'left-2')}>
          <Badge className="bg-primary/90 text-white text-xs capitalize">
            {video.category}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className={cn(
          'font-medium text-sm line-clamp-1',
          isBulkMode && 'cursor-pointer'
        )}>
          {video.title}
        </h3>
        {video.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{video.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <Badge variant="outline" className="text-xs capitalize">
            {video.difficulty}
          </Badge>
          {!isBulkMode && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                aria-label={`Editar ${video.title}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload?.();
                }}
                aria-label={`Baixar ${video.title}`}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                aria-label={`Excluir ${video.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Video List Item Component
function VideoListItem({
  video,
  onPlay,
  onPlayPlaylist,
  onDelete,
  onEdit,
  onDownload,
  isBulkMode,
  isSelected,
  onToggleSelect,
}: {
  video: ExerciseVideo;
  onPlay: () => void;
  onPlayPlaylist?: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onDownload?: () => void;
  isBulkMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
        isSelected && 'ring-2 ring-primary'
      )}
    >
      {/* Selection checkbox */}
      {isBulkMode && (
        <button
          onClick={onToggleSelect}
          className={cn(
            'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
            isSelected
              ? 'bg-primary border-primary'
              : 'border-muted-foreground/30 hover:border-primary'
          )}
        >
          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
        </button>
      )}

      {/* Thumbnail */}
      <div className="relative w-32 h-20 flex-shrink-0 rounded overflow-hidden bg-muted cursor-pointer" onClick={isBulkMode ? onToggleSelect : onPlay}>
        {video.thumbnail_url ? (
          <OptimizedImage src={video.thumbnail_url} alt={video.title} className="w-full h-full" aspectRatio="16:9" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="h-8 w-8 text-primary/30" />
          </div>
        )}
        {!isBulkMode && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" onClick={onPlay} className="w-8 h-8 rounded-full bg-white/90" aria-label={`Reproduzir ${video.title}`}>
              <Play className="h-4 w-4 fill-black text-black ml-0.5" />
            </Button>
          </div>
        )}
        {video.duration && (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px]">
            {exerciseVideosService.formatDuration(video.duration)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={isBulkMode ? onToggleSelect : undefined}>
        <h4 className="font-medium text-sm truncate">{video.title}</h4>
        {video.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{video.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs capitalize">
            {video.category}
          </Badge>
          <Badge variant="outline" className="text-xs capitalize">
            {video.difficulty}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      {!isBulkMode && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onPlay}>
            <Play className="h-4 w-4 mr-1" />
            Assistir
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted"
            onClick={onEdit}
            aria-label={`Editar ${video.title}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted"
            onClick={onDownload}
            aria-label={`Baixar ${video.title}`}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            aria-label={`Excluir ${video.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Otimizado com React.memo para evitar re-renders desnecessários
export const ExerciseVideoLibraryMemo = memo(ExerciseVideoLibrary, (prevProps, nextProps) => {
  // Custom comparison para determinar quando re-renderizar
  return prevProps.onUploadClick === nextProps.onUploadClick;
});
