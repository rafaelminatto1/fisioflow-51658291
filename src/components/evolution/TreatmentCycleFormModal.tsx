/**
 * TreatmentCycleFormModal
 *
 * Create / edit treatment cycles (Linear-inspired sprints).
 * Uses a Dialog with a controlled form (react-hook-form + zod).
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { TreatmentCycle } from './TreatmentCycles';
import type { CreateCycleInput } from '@/hooks/evolution/useTreatmentCycles';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório').max(100),
    startDate: z.string().min(1, 'Data de início é obrigatória'),
    endDate: z.string().min(1, 'Data de término é obrigatória'),
    sessionsCount: z
      .number({ invalid_type_error: 'Informe um número' })
      .int()
      .min(1, 'Mínimo 1 sessão')
      .max(200),
    status: z.enum(['active', 'completed', 'upcoming', 'paused']),
    goals: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'Data de término deve ser após o início',
    path: ['endDate'],
  });

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TreatmentCycleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle?: TreatmentCycle | null;
  onSubmit: (data: CreateCycleInput) => Promise<void>;
  isSaving?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: TreatmentCycle['status']; label: string }[] = [
  { value: 'upcoming', label: 'Próximo' },
  { value: 'active', label: 'Ativo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'completed', label: 'Concluído' },
];

export function TreatmentCycleFormModal({
  open,
  onOpenChange,
  cycle,
  onSubmit,
  isSaving = false,
}: TreatmentCycleFormModalProps) {
  const isEditing = !!cycle;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: '',
      sessionsCount: 10,
      status: 'upcoming',
      goals: '',
      notes: '',
    },
  });

  // Sync form when editing an existing cycle
  useEffect(() => {
    if (cycle) {
      form.reset({
        name: cycle.name,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        sessionsCount: cycle.sessionsCount,
        status: cycle.status,
        goals: cycle.goals.join('\n'),
        notes: cycle.notes ?? '',
      });
    } else {
      form.reset({
        name: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: '',
        sessionsCount: 10,
        status: 'upcoming',
        goals: '',
        notes: '',
      });
    }
  }, [cycle, form]);

  const handleSubmit = async (values: FormValues) => {
    const goalsArray = values.goals
      ? values.goals.split('\n').map((g) => g.trim()).filter(Boolean)
      : [];

    await onSubmit({
      name: values.name,
      startDate: values.startDate,
      endDate: values.endDate,
      sessionsCount: values.sessionsCount,
      completedSessions: cycle?.completedSessions ?? 0,
      status: values.status,
      goals: goalsArray,
      notes: values.notes,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Ciclo de Tratamento' : 'Novo Ciclo de Tratamento'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Nome */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do ciclo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Fase 1 – Controle da dor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Datas lado a lado */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Término</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Sessões + Status lado a lado */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="sessionsCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total de sessões</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={200}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Objetivos */}
            <FormField
              control={form.control}
              name="goals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Objetivos do ciclo{' '}
                    <span className="text-muted-foreground font-normal">(um por linha)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Reduzir dor para ≤ 3/10&#10;Recuperar ADM completa&#10;Retorno às AVDs"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notas */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Observações{' '}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Orientações, condições especiais..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Salvar alterações' : 'Criar ciclo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
