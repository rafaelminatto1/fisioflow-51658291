import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateConduct, type ConductTemplate } from '@/hooks/useConductLibrary';

const formSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  category: z.string().min(1, 'Selecione uma categoria'),
  conduct_text: z.string().min(10, 'Conduta deve ter no mínimo 10 caracteres'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddConductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conduct?: ConductTemplate | null;
}

export function AddConductModal({ open, onOpenChange, conduct }: AddConductModalProps) {
  const createMutation = useCreateConduct();

  const categories = [
    'Mobilização Articular',
    'Fortalecimento',
    'Alongamento',
    'Liberação Miofascial',
    'Técnicas Manuais',
    'Eletroterapia',
    'Terapia Postural',
    'Treino Funcional',
    'Exercícios Respiratórios',
    'Outros',
  ];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      category: '',
      conduct_text: '',
      description: '',
    },
  });

  useEffect(() => {
    if (conduct) {
      form.reset({
        title: conduct.title,
        category: conduct.category,
        conduct_text: conduct.conduct_text,
        description: conduct.description || '',
      });
    } else {
      form.reset({
        title: '',
        category: '',
        conduct_text: '',
        description: '',
      });
    }
  }, [conduct, form]);

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data as unknown as ConductFormData, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 transform !-translate-x-1/2 !-translate-y-1/2 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl rounded-xl border border-border/40 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>{conduct ? 'Editar Conduta' : 'Nova Conduta'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Mobilização de ombro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
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
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Breve descrição sobre quando usar esta conduta"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="conduct_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conduta</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a conduta detalhadamente..."
                      className="min-h-[200px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? 'Salvando...' : 'Criar Conduta'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
