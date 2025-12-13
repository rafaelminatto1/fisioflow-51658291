import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExerciseTemplates, type ExerciseTemplate } from '@/hooks/useExerciseTemplates';

const templateSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  category: z.enum(['patologia', 'pos_operatorio']),
  condition_name: z.string().min(2, 'Condição obrigatória'),
  template_variant: z.string().optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ExerciseTemplate;
  defaultCategory?: 'patologia' | 'pos_operatorio';
}

// Condições pré-definidas
const PATOLOGIAS = [
  'Pata de Ganso',
  'Cotovelo de Tenista',
  'Cervicalgia',
  'Lombalgia',
  'Fascite Plantar',
  'Bursite',
  'Tendinite Patelar',
  'Síndrome do Túnel do Carpo',
  'Epicondilite',
  'Outro',
];

const POS_OPERATORIOS = [
  'LCA (Ligamento Cruzado Anterior)',
  'Prótese de Quadril',
  'Prótese de Joelho',
  'Menisco',
  'Manguito Rotador',
  'Hénia Discal',
  'Artrodese',
  'Outro',
];

export function TemplateModal({
  open,
  onOpenChange,
  template,
  defaultCategory = 'patologia',
}: TemplateModalProps) {
  const { createTemplate, updateTemplate, isCreating, isUpdating } = useExerciseTemplates();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      category: defaultCategory,
      condition_name: '',
      template_variant: '',
    },
  });

  const category = form.watch('category');
  const conditionOptions = category === 'patologia' ? PATOLOGIAS : POS_OPERATORIOS;

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        description: template.description || '',
        category: template.category,
        condition_name: template.condition_name,
        template_variant: template.template_variant || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        category: defaultCategory,
        condition_name: '',
        template_variant: '',
      });
    }
  }, [template, defaultCategory, form]);

  const handleSubmit = (data: TemplateFormData) => {
    const payload = {
      name: data.name,
      description: data.description,
      category: data.category,
      condition_name: data.condition_name,
      template_variant: data.template_variant,
    };
    
    if (template) {
      updateTemplate({ id: template.id, ...payload });
    } else {
      createTemplate(payload as any);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Editar Template' : 'Novo Template de Exercícios'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="patologia">Patologia</SelectItem>
                      <SelectItem value="pos_operatorio">Pós-Operatório</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="condition_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condição</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a condição" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {conditionOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.value === 'Outro' && (
                    <Input
                      placeholder="Digite a condição"
                      onChange={(e) => field.onChange(e.target.value)}
                      className="mt-2"
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Template</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Protocolo Conservador" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="template_variant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variante (Opcional)</FormLabel>
                  <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a variante" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      <SelectItem value="conservador">Conservador</SelectItem>
                      <SelectItem value="agressivo">Agressivo</SelectItem>
                      <SelectItem value="inicial">Inicial</SelectItem>
                      <SelectItem value="intermediario">Intermediário</SelectItem>
                      <SelectItem value="avancado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Textarea
                      placeholder="Descreva o objetivo e indicações deste template..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {template ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
