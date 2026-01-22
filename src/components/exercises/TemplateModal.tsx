import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/web/ui/form';
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import { Button } from '@/components/shared/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/shared/ui/tabs';
import { useExerciseTemplates, type ExerciseTemplate } from '@/hooks/useExerciseTemplates';

const templateSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  category: z.enum(['patologia', 'pos_operatorio']),
  condition_name: z.string().min(2, 'Condição obrigatória'),
  template_variant: z.string().optional(),
  clinical_notes: z.string().optional(),
  contraindications: z.string().optional(),
  precautions: z.string().optional(),
  progression_notes: z.string().optional(),
  evidence_level: z.enum(['A', 'B', 'C', 'D']).optional().or(z.literal('')),
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
        clinical_notes: template.clinical_notes || '',
        contraindications: template.contraindications || '',
        precautions: template.precautions || '',
        progression_notes: template.progression_notes || '',
        evidence_level: (template.evidence_level as any) || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        category: defaultCategory,
        condition_name: '',
        template_variant: '',
        clinical_notes: '',
        contraindications: '',
        precautions: '',
        progression_notes: '',
        evidence_level: '',
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
      clinical_notes: data.clinical_notes,
      contraindications: data.contraindications,
      precautions: data.precautions,
      progression_notes: data.progression_notes,
      evidence_level: data.evidence_level || null,
    };

    if (template) {
      updateTemplate({ id: template.id, ...payload });
    } else {
      createTemplate(payload as TemplateFormData);
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="evidence_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível de Evidência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A">Nível A (Alta)</SelectItem>
                        <SelectItem value="B">Nível B (Moderada)</SelectItem>
                        <SelectItem value="C">Nível C (Baixa)</SelectItem>
                        <SelectItem value="D">Nível D (Consenso)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 border-t pt-4 mt-4">
              <h3 className="font-semibold text-sm text-gray-900">Informações Clínicas</h3>

              <FormField
                control={form.control}
                name="clinical_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações Clínicas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notas importantes para o fisioterapeuta..."
                        {...field}
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contraindications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraindicações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Quando não utilizar este protocolo..."
                        {...field}
                        rows={2}
                        className="border-red-200 focus-visible:ring-red-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="precautions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precauções</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Cuidados a serem tomados..."
                        {...field}
                        rows={2}
                        className="border-yellow-200 focus-visible:ring-yellow-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="progression_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Critérios de Progressão</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Quando avançar para a próxima fase..."
                        {...field}
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
