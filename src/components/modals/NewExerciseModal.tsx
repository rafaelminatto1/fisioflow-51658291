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
import type { Exercise } from '@/hooks/useExercises';

const exerciseSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.enum(['Iniciante', 'Intermediário', 'Avançado']).optional(),
  video_url: z.string().url('URL inválida').optional().or(z.literal('')),
  image_url: z.string().url('URL inválida').optional().or(z.literal('')),
  instructions: z.string().optional(),
  sets: z.number().int().positive().optional(),
  repetitions: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
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

export function NewExerciseModal({ open, onOpenChange, onSubmit, exercise, isLoading }: ExerciseModalProps) {
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

  const handleSubmit = (data: ExerciseFormData) => {
    onSubmit(data as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exercise ? 'Editar Exercício' : 'Novo Exercício'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-3 gap-4">
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
                  <FormLabel>URL do Vídeo</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Imagem</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://..." />
                  </FormControl>
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

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : exercise ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}