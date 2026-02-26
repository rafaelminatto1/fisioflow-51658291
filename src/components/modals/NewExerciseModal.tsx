import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Upload, X, Film, Image as ImageIcon } from 'lucide-react';
import { api } from '@/integrations/firebase/functions';
import { auth, storage } from '@/integrations/firebase/app';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import type { Exercise } from '@/hooks/useExercises';

const exerciseSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.enum(['Iniciante', 'Intermediário', 'Avançado']).optional(),
  video_url: z.string().optional().or(z.literal('')),
  image_url: z.string().optional().or(z.literal('')),
  instructions: z.string().optional(),
  sets: z.number().int().positive().optional().nullable(),
  repetitions: z.number().int().positive().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  indicated_pathologies: z.array(z.string()).optional(),
  contraindicated_pathologies: z.array(z.string()).optional(),
  body_parts: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
});

type ExerciseFormData = z.infer<typeof exerciseSchema>;

interface ExerciseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Exercise, 'id' | 'created_at' | 'updated_at'>) => void;
  exercise?: Exercise;
  isLoading?: boolean;
}

export function NewExerciseModal({ open, onOpenChange, onSubmit, exercise, isLoading: isSaving }: ExerciseModalProps) {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [videoFile, setVideoFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [videoPreview, setVideoPreview] = React.useState<string | null>(null);

  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      difficulty: undefined,
      video_url: '',
      image_url: '',
      instructions: '',
      sets: undefined,
      repetitions: undefined,
      duration: undefined,
      indicated_pathologies: [],
      contraindicated_pathologies: [],
      body_parts: [],
      equipment: [],
    },
  });

  useEffect(() => {
    // Clear files and previews when switching exercises or opening/closing
    setImageFile(null);
    setVideoFile(null);
    setImagePreview(null);
    setVideoPreview(null);
    setUploadProgress(0);
    setIsUploading(false);

    if (exercise) {
      form.reset({
        name: exercise.name || '',
        description: exercise.description || '',
        category: exercise.category || '',
        difficulty: exercise.difficulty as 'Iniciante' | 'Intermediário' | 'Avançado' || undefined,
        video_url: exercise.video_url || '',
        image_url: exercise.image_url || '',
        instructions: exercise.instructions || '',
        sets: exercise.sets || undefined,
        repetitions: exercise.repetitions || undefined,
        duration: exercise.duration || undefined,
        indicated_pathologies: exercise.indicated_pathologies || [],
        contraindicated_pathologies: exercise.contraindicated_pathologies || [],
        body_parts: exercise.body_parts || [],
        equipment: exercise.equipment || [],
      });
    } else {
      form.reset({
        name: '',
        description: '',
        category: '',
        difficulty: undefined,
        video_url: '',
        image_url: '',
        instructions: '',
        sets: undefined,
        repetitions: undefined,
        duration: undefined,
        indicated_pathologies: [],
        contraindicated_pathologies: [],
        body_parts: [],
        equipment: [],
      });
    }
  }, [exercise, form]);

  const handleAnalyzeImage = async () => {
    const imageUrl = form.getValues('image_url');
    if (!imageUrl) {
      toast({
        title: 'URL da imagem necessária',
        description: 'Insira a URL de uma imagem para analisar',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await api.exerciseAnalysis.analyze(imageUrl);
      if (result.success && result.analysis) {
        // Preencher campos automaticamente baseados na análise
        if (result.analysis.labels?.length > 0) {
          const currentDesc = form.getValues('description') || '';
          const aiTags = `Tags IA: ${result.analysis.labels.join(', ')}`;
          form.setValue('description', currentDesc ? `${currentDesc}\n\n${aiTags}` : aiTags);
        }
        
        toast({
          title: 'Análise concluída',
          description: 'A imagem foi analisada e as informações foram extraídas.',
        });
      }
    } catch (error) {
      console.error('Erro na análise:', error);
      toast({
        title: 'Erro na análise',
        description: 'Não foi possível analisar a imagem no momento.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === 'image') {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Erro', description: 'Por favor selecione uma imagem', variant: 'destructive' });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      if (!file.type.startsWith('video/')) {
        toast({ title: 'Erro', description: 'Por favor selecione um vídeo', variant: 'destructive' });
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const fullPath = `${path}/${user.uid}/${fileName}`;
    const storageRef = ref(storage, fullPath);

    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleSubmit = async (data: ExerciseFormData) => {
    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      let finalImageUrl = data.image_url;
      let finalVideoUrl = data.video_url;

      if (imageFile) {
        setUploadProgress(20);
        finalImageUrl = await uploadFile(imageFile, 'exercise-images');
      }

      if (videoFile) {
        setUploadProgress(imageFile ? 50 : 30);
        finalVideoUrl = await uploadFile(videoFile, 'exercise-videos');
      }

      setUploadProgress(90);
      onSubmit({
        ...data,
        image_url: finalImageUrl,
        video_url: finalVideoUrl,
      } as Omit<Exercise, 'id' | 'created_at' | 'updated_at'>);
      
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar exercício:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao fazer upload dos arquivos. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 sm:p-6 pb-2">
          <DialogTitle className="text-lg sm:text-xl">{exercise ? 'Editar Exercício' : 'Novo Exercício'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2">
          <Form {...form}>
            <form id="exercise-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do exercício" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Descrição do exercício" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Fortalecimento" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dificuldade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Iniciante">Iniciante</SelectItem>
                          <SelectItem value="Intermediário">Intermediário</SelectItem>
                          <SelectItem value="Avançado">Avançado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instruções</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Instruções detalhadas" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="sets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Séries</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="repetitions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repetições</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração (seg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="video_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vídeo</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <FormControl>
                          <Input {...field} placeholder="URL do Vídeo (Youtube, Vimeo...)" className="flex-1" />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => videoInputRef.current?.click()}
                          title="Fazer upload de vídeo"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <input
                        type="file"
                        ref={videoInputRef}
                        className="hidden"
                        accept="video/*"
                        onChange={(e) => handleFileChange(e, 'video')}
                      />

                      {videoPreview && (
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-black mt-2">
                          <video src={videoPreview} className="w-full h-full object-contain" controls />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={() => {
                              setVideoFile(null);
                              setVideoPreview(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {videoFile && !videoPreview && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <Film className="h-4 w-4" />
                          <span className="text-sm truncate">{videoFile.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-auto"
                            onClick={() => setVideoFile(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagem</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <FormControl>
                          <Input {...field} placeholder="URL da Imagem" className="flex-1" />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => imageInputRef.current?.click()}
                          title="Fazer upload de imagem"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button 
                          type="button" 
                          variant="secondary" 
                          size="icon" 
                          onClick={handleAnalyzeImage}
                          disabled={isAnalyzing || !field.value}
                          title="Analisar com IA"
                        >
                          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        </Button>
                      </div>

                      <input
                        type="file"
                        ref={imageInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'image')}
                      />

                      {imagePreview && (
                        <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted mt-2">
                          <img src={imagePreview} className="w-full h-full object-contain" alt="Preview" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {imageFile && !imagePreview && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <ImageIcon className="h-4 w-4" />
                          <span className="text-sm truncate">{imageFile.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-auto"
                            onClick={() => setImageFile(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="indicated_pathologies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patologias Indicadas (separar por vírgula)</FormLabel>
                      <FormControl>
                        {/* Handle string[] <-> string conversion here or in schema */}
                        {/* Since Zod schema handles simple strings, we might need to update schema too. 
                             For quick implementation, let's treat it as string in form and split on submit, 
                             but matching Zod type is better. 
                             Let's stick to simple Textarea and I will update schema next.
                         */}
                        <Textarea
                          placeholder="Ex: Joelho Valgo, Artrose"
                          {...field}
                          value={Array.isArray(field.value) ? field.value.join(', ') : field.value || ''}
                          onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contraindicated_pathologies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraindicações (separar por vírgula)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: Fratura Recente"
                          {...field}
                          value={Array.isArray(field.value) ? field.value.join(', ') : field.value || ''}
                          onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="body_parts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partes do Corpo (separar por vírgula)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Ombro, Cotovelo"
                          {...field}
                          value={Array.isArray(field.value) ? field.value.join(', ') : field.value || ''}
                          onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="equipment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipamentos (separar por vírgula)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Halter, Elástico"
                          {...field}
                          value={Array.isArray(field.value) ? field.value.join(', ') : field.value || ''}
                          onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>
        
        {isUploading && (
          <div className="px-4 sm:px-6 py-2 border-t">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Fazendo upload...</span>
              <span className="text-xs font-medium text-muted-foreground">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1" />
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 p-4 sm:p-6 pt-4 border-t mt-auto bg-background">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto" disabled={isUploading || isSaving}>
            Cancelar
          </Button>
          <Button type="submit" form="exercise-form" disabled={isSaving || isUploading} className="w-full sm:w-auto">
            {isUploading ? 'Fazendo Upload...' : isSaving ? 'Salvando...' : exercise ? 'Atualizar' : 'Criar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}