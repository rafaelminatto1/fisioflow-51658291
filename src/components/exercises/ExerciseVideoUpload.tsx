import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Video, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUploadExerciseVideo } from '@/hooks/useExerciseVideos';
import { toast } from '@/hooks/use-toast';
import {
  VIDEO_CATEGORIES,
  VIDEO_DIFFICULTY,
  BODY_PARTS,
  EQUIPMENT_OPTIONS,
} from '@/services/exerciseVideos';

export interface ExerciseVideoUploadProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  exerciseId?: string;
}

export const ExerciseVideoUpload: React.FC<ExerciseVideoUploadProps> = ({
  open = true,
  onOpenChange,
  onSuccess,
  exerciseId,
}) => {
  const uploadMutation = useUploadExerciseVideo();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setDifficulty('');
    setSelectedBodyParts([]);
    setSelectedEquipment([]);
    setVideoFile(null);
    setThumbnailFile(null);
    setThumbnailPreview('');
    setVideoPreview('');
    setUploadProgress(0);
    setIsUploading(false);
  };

  const handleClose = () => {
    if (!isUploading) {
      resetForm();
      onOpenChange?.(false);
    }
  };

  const handleVideoDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type.startsWith('video/')) {
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'O vídeo deve ter no máximo 100MB',
          variant: 'destructive',
        });
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleVideoDrop,
    accept: {
      'video/*': ['.mp4', '.webm', '.mov', '.avi'],
    },
    multiple: false,
    disabled: isUploading,
  });

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const toggleBodyPart = (part: string) => {
    setSelectedBodyParts((prev) =>
      prev.includes(part)
        ? prev.filter((p) => p !== part)
        : [...prev, part]
    );
  };

  const toggleEquipment = (equipment: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(equipment)
        ? prev.filter((e) => e !== equipment)
        : [...prev, equipment]
    );
  };

  const isFormValid = () => {
    return (
      title.trim() !== '' &&
      category !== '' &&
      difficulty !== '' &&
      videoFile !== null
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      await uploadMutation.mutateAsync(
        {
          exercise_id: exerciseId,
          title: title.trim(),
          description: description.trim() || undefined,
          file: videoFile!,
          thumbnail: thumbnailFile || undefined,
          category,
          difficulty,
          body_parts: selectedBodyParts,
          equipment: selectedEquipment,
        },
        {
          onSuccess: () => {
            setUploadProgress(100);
            toast({
              title: 'Vídeo enviado com sucesso',
              description: 'O vídeo de exercício foi adicionado à biblioteca.',
            });
            resetForm();
            onSuccess?.();
            onOpenChange?.(false);
          },
          onError: (error: any) => {
            toast({
              title: 'Erro ao enviar vídeo',
              description: error.message || 'Tente novamente mais tarde',
              variant: 'destructive',
            });
            setIsUploading(false);
            setUploadProgress(0);
          },
        }
      );
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar vídeo',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Vídeo de Exercício</DialogTitle>
          <DialogDescription>
            Faça upload de um vídeo demonstrativo de exercício para a biblioteca
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Video Upload */}
          <div className="space-y-2">
            <Label>
              Vídeo <span className="text-destructive">*</span>
            </Label>
            {!videoFile ? (
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  'hover:border-primary/50 hover:bg-muted/50',
                  isDragActive && 'border-primary bg-primary/5'
                )}
              >
                <input {...getInputProps()} />
                <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {isDragActive
                    ? 'Solte o vídeo aqui'
                    : 'Arraste um vídeo ou clique para selecionar'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  MP4, WebM, MOV (máx. 100MB)
                </p>
              </div>
            ) : (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-primary" />
                        <p className="font-medium text-sm">{videoFile.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatFileSize(videoFile.size)}
                      </p>
                      <video
                        src={videoPreview}
                        className="mt-3 rounded-md w-full max-h-48 object-cover"
                        controls
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setVideoFile(null);
                        setVideoPreview('');
                      }}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Thumbnail Upload (Optional) */}
          <div className="space-y-2">
            <Label>Thumbnail (opcional)</Label>
            {!thumbnailPreview ? (
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-primary/50',
                  isUploading && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => !isUploading && thumbnailInputRef.current?.click()}
              >
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="hidden"
                  disabled={isUploading}
                />
                <p className="text-sm text-muted-foreground">
                  Clique para adicionar uma imagem de capa
                </p>
              </div>
            ) : (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail"
                      className="w-24 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Thumbnail personalizada</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-destructive"
                        onClick={() => {
                          setThumbnailFile(null);
                          setThumbnailPreview('');
                          if (thumbnailInputRef.current) {
                            thumbnailInputRef.current.value = '';
                          }
                        }}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remover
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>
              Título do Exercício <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Ex: Rotação de Ombro com Bastão"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isUploading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Descreva o exercício, objetivo e cuidados importantes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              rows={3}
            />
          </div>

          {/* Category and Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Categoria <span className="text-destructive">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory} disabled={isUploading}>
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
              <Select value={difficulty} onValueChange={setDifficulty} disabled={isUploading}>
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
                  variant={selectedBodyParts.includes(part) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => !isUploading && toggleBodyPart(part)}
                >
                  {part.charAt(0).toUpperCase() + part.slice(1)}
                  {selectedBodyParts.includes(part) && (
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
                  variant={selectedEquipment.includes(eq) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => !isUploading && toggleEquipment(eq)}
                >
                  {eq.charAt(0).toUpperCase() + eq.slice(1)}
                  {selectedEquipment.includes(eq) && (
                    <Check className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                <span>Enviando vídeo...</span>
                <span className="text-muted-foreground">({uploadProgress}%)</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid() || isUploading}
          >
            {isUploading ? 'Enviando...' : 'Adicionar Vídeo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseVideoUpload;
