/**
 * TimeEntryModal - Modal para criar/editar entrada de tempo manual
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {

  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';

import type { TimeEntry } from '@/types/timetracking';

const timeEntrySchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  date: z.date(),
  start_time: z.string(),
  duration_minutes: z.number().min(1, 'Duração mínima de 1 minuto'),
  is_billable: z.boolean().optional(),
  hourly_rate: z.number().optional(),
  tags: z.string().optional(),
});

type TimeEntryFormData = z.infer<typeof timeEntrySchema>;

interface TimeEntryModalProps {
  onClose: () => void;
  onSave: (data: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  entry?: TimeEntry;
}

export function TimeEntryModal({ onClose, onSave, entry }: TimeEntryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      description: entry?.description || '',
      date: entry ? entry.start_time.toDate() : new Date(),
      start_time: entry
        ? format(entry.start_time.toDate(), 'HH:mm')
        : format(new Date(), 'HH:mm'),
      duration_minutes: Math.round((entry?.duration_seconds || 0) / 60),
      is_billable: entry?.is_billable ?? true,
      hourly_rate: entry?.hourly_rate,
      tags: entry?.tags?.join(', ') || '',
    },
  });

  const handleSubmit = async (data: TimeEntryFormData) => {
    setIsSubmitting(true);

    try {
      // Parse start time
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const startDate = new Date(data.date);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate.getTime() + data.duration_minutes * 60 * 1000);

      const durationSeconds = data.duration_minutes * 60;
      const totalValue =
        data.is_billable && data.hourly_rate
          ? (durationSeconds / 3600) * data.hourly_rate
          : undefined;

      await onSave({
        user_id: '', // Será preenchido pelo hook
        organization_id: '', // Será preenchido pelo hook
        description: data.description,
        start_time: { toDate: () => startDate, seconds: 0, nanoseconds: 0 } as unknown,
        end_time: { toDate: () => endDate, seconds: 0, nanoseconds: 0 } as unknown,
        duration_seconds: durationSeconds,
        is_billable: data.is_billable ?? true,
        hourly_rate: data.hourly_rate,
        total_value: totalValue,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()) : [],
      });

      toast.success('Entrada criada com sucesso!');
      onClose();
    } catch (err) {
      toast.error('Erro ao criar entrada de tempo');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Entrada de Tempo</DialogTitle>
          <DialogDescription>
            Adicione manualmente o tempo gasto em uma tarefa ou atividade.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="O que você fez?"
                      {...field}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, 'PPP', { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Horário Início */}
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duração (minutos) */}
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="60"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {field.value && (
                        <span>
                          {Math.floor(field.value / 60)}h {field.value % 60}min
                        </span>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Faturável */}
            <FormField
              control={form.control}
              name="is_billable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Faturável</FormLabel>
                    <FormDescription>
                      Este tempo pode ser cobrado do cliente?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Taxa Horária (se faturável) */}
            <FormField
              control={form.control}
              name="hourly_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taxa Horária (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Deixe em branco para usar a taxa padrão da organização
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (separadas por vírgula)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="admin, reunião, projeto-x"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Tags ajudam a categorizar e filtrar entradas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
