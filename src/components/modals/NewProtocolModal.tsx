import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Button } from '@/components/ui/button';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Milestone, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ExerciseProtocol, ProtocolMilestone, ProtocolRestriction } from '@/hooks/useExerciseProtocols';

const milestoneSchema = z.object({
  week: z.coerce.number().min(1, 'Semana deve ser pelo menos 1'),
  description: z.string().min(1, 'Descrição obrigatória'),
});

const restrictionSchema = z.object({
  week_start: z.coerce.number().min(1, 'Semana inicial obrigatória'),
  week_end: z.coerce.number().optional(),
  description: z.string().min(1, 'Descrição obrigatória'),
});

const protocolSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  condition_name: z.string().min(2, 'Condição obrigatória'),
  protocol_type: z.enum(['pos_operatorio', 'patologia']),
  weeks_total: z.coerce.number().min(1, 'Duração obrigatória').optional(),
  milestones: z.array(milestoneSchema),
  restrictions: z.array(restrictionSchema),
});

type ProtocolFormData = z.infer<typeof protocolSchema>;

interface ProtocolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<ExerciseProtocol, 'id' | 'created_at' | 'updated_at'>) => void;
  protocol?: ExerciseProtocol;
  isLoading?: boolean;
}

const CONDITIONS_POS_OP = [
  'Reconstrução do LCA',
  'Reconstrução do LCP',
  'Prótese Total de Quadril',
  'Prótese Total de Joelho',
  'Artroscopia de Ombro',
  'Artroscopia de Joelho',
  'Reparo do Manguito Rotador',
  'Liberação do Túnel do Carpo',
  'Fusão Lombar',
  'Discectomia',
  'Outro',
];

const CONDITIONS_PATOLOGIA = [
  'Cervicalgia',
  'Lombalgia',
  'Tendinopatia de Ombro',
  'Tendinopatia Patelar',
  'Epicondilite Lateral',
  'Epicondilite Medial',
  'Síndrome do Impacto',
  'Capsulite Adesiva',
  'Fascite Plantar',
  'Síndrome Patelofemoral',
  'Pata de Ganso',
  'Entorse de Tornozelo',
  'Outro',
];

export function NewProtocolModal({
  open,
  onOpenChange,
  onSubmit,
  protocol,
  isLoading
}: ProtocolModalProps) {
  const [customCondition, setCustomCondition] = useState('');

  const form = useForm<ProtocolFormData>({
    resolver: zodResolver(protocolSchema),
    defaultValues: {
      name: '',
      condition_name: '',
      protocol_type: 'pos_operatorio',
      weeks_total: 12,
      milestones: [],
      restrictions: [],
    },
  });

  const { fields: milestoneFields, append: appendMilestone, remove: removeMilestone } = useFieldArray({
    control: form.control,
    name: 'milestones',
  });

  const { fields: restrictionFields, append: appendRestriction, remove: removeRestriction } = useFieldArray({
    control: form.control,
    name: 'restrictions',
  });

  const protocolType = form.watch('protocol_type');
  const conditionName = form.watch('condition_name');
  const conditions = protocolType === 'pos_operatorio' ? CONDITIONS_POS_OP : CONDITIONS_PATOLOGIA;

  useEffect(() => {
    if (protocol) {
      const milestones = Array.isArray(protocol.milestones) ? protocol.milestones : [];
      const restrictions = Array.isArray(protocol.restrictions) ? protocol.restrictions : [];

      form.reset({
        name: protocol.name || '',
        condition_name: protocol.condition_name || '',
        protocol_type: protocol.protocol_type || 'pos_operatorio',
        weeks_total: protocol.weeks_total || 12,
        milestones: milestones.map((m: ProtocolMilestone) => ({
          week: m.week,
          description: m.description,
        })),
        restrictions: restrictions.map((r: ProtocolRestriction) => ({
          week_start: r.week_start,
          week_end: r.week_end,
          description: r.description,
        })),
      });

      const localConditions = (protocol.protocol_type || 'pos_operatorio') === 'pos_operatorio'
        ? CONDITIONS_POS_OP
        : CONDITIONS_PATOLOGIA;

      if (!localConditions.includes(protocol.condition_name)) {
        setCustomCondition(protocol.condition_name);
      }
    } else {
      form.reset({
        name: '',
        condition_name: '',
        protocol_type: 'pos_operatorio',
        weeks_total: 12,
        milestones: [],
        restrictions: [],
      });
      setCustomCondition('');
    }
  }, [protocol, form, open]);

  const handleSubmit = (data: ProtocolFormData) => {
    const finalCondition = data.condition_name === 'Outro' ? customCondition : data.condition_name;

    onSubmit({
      name: data.name,
      condition_name: finalCondition,
      protocol_type: data.protocol_type,
      weeks_total: data.weeks_total,
      milestones: data.milestones,
      restrictions: data.restrictions,
      progression_criteria: [],
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{protocol ? 'Editar Protocolo' : 'Novo Protocolo'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <Form {...form}>
            <form id="protocol-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="protocol_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo*</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pos_operatorio">Pós-Operatório</SelectItem>
                          <SelectItem value="patologia">Patologia</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weeks_total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração (semanas)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={1} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="condition_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condição/Patologia*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a condição" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {conditions.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {conditionName === 'Outro' && (
                <FormItem>
                  <FormLabel>Nome da Condição</FormLabel>
                  <FormControl>
                    <Input
                      value={customCondition}
                      onChange={(e) => setCustomCondition(e.target.value)}
                      placeholder="Digite o nome da condição"
                    />
                  </FormControl>
                </FormItem>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Protocolo*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Protocolo Padrão - Fase 1 a 4" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Milestones Section */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Milestone className="h-5 w-5 text-green-500" />
                    <h4 className="font-semibold">Marcos de Progressão</h4>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendMilestone({ week: 1, description: '' })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                <div className="space-y-3">
                  {milestoneFields.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum marco adicionado. Clique em "Adicionar" para criar um marco.
                    </p>
                  ) : (
                    milestoneFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 items-start bg-muted/50 p-3 rounded-lg">
                        <FormField
                          control={form.control}
                          name={`milestones.${index}.week`}
                          render={({ field }) => (
                            <FormItem className="w-24">
                              <FormLabel className="text-xs">Semana</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} min={1} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`milestones.${index}.description`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs">Descrição</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Carga parcial com muletas" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-6"
                          onClick={() => removeMilestone(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Restrictions Section */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <h4 className="font-semibold">Restrições</h4>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendRestriction({ week_start: 1, week_end: undefined, description: '' })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                <div className="space-y-3">
                  {restrictionFields.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma restrição adicionada. Clique em "Adicionar" para criar uma restrição.
                    </p>
                  ) : (
                    restrictionFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 items-start bg-amber-500/5 p-3 rounded-lg border border-amber-500/20">
                        <FormField
                          control={form.control}
                          name={`restrictions.${index}.week_start`}
                          render={({ field }) => (
                            <FormItem className="w-20">
                              <FormLabel className="text-xs">De</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} min={1} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`restrictions.${index}.week_end`}
                          render={({ field }) => (
                            <FormItem className="w-20">
                              <FormLabel className="text-xs">Até</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  placeholder="-"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`restrictions.${index}.description`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs">Descrição</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Não fazer flexão além de 90°" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-6"
                          onClick={() => removeRestriction(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </form>
          </Form>
        </ScrollArea>

        <div className="flex justify-end gap-2 p-6 pt-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="protocol-form" disabled={isLoading}>
            {isLoading ? 'Salvando...' : (protocol ? 'Salvar Alterações' : 'Criar Protocolo')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
