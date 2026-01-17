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
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{protocol ? 'Editar Protocolo' : 'Novo Protocolo'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <Form {...form}>
            <form id="protocol-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-4 pt-4">
              {/* Basic Info */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name="protocol_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo*</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
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
                </div>

                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="weeks_total"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duração (sem)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={1} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-4">
                  <FormField
                    control={form.control}
                    name="condition_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condição/Patologia*</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
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
                </div>

                <div className="col-span-3">
                  {conditionName === 'Outro' ? (
                    <FormItem>
                      <FormLabel>Nome da Condição</FormLabel>
                      <FormControl>
                        <Input
                          value={customCondition}
                          onChange={(e) => setCustomCondition(e.target.value)}
                          placeholder="Digite o nome"
                        />
                      </FormControl>
                    </FormItem>
                  ) : (
                    <div className="h-full" /> /* Spacer if not 'Outro' */
                  )}
                </div>

                <div className="col-span-12">
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
                </div>
              </div>

              {/* Lists Grid */}
              <div className="grid grid-cols-2 gap-6">

                {/* Milestones Section */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
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
                      Add
                    </Button>
                  </div>

                  <Card className="p-0 border-0 shadow-none bg-transparent">
                    <div className="space-y-3">
                      {milestoneFields.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg border-dashed bg-muted/30">
                          Nenhum marco definido
                        </div>
                      ) : (
                        milestoneFields.map((field, index) => (
                          <div key={field.id} className="flex gap-2 items-start bg-muted/50 p-3 rounded-lg border">
                            <FormField
                              control={form.control}
                              name={`milestones.${index}.week`}
                              render={({ field }) => (
                                <FormItem className="w-20 shrink-0">
                                  <FormLabel className="text-xs text-muted-foreground">Semana</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} min={1} className="h-8 text-sm" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`milestones.${index}.description`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormLabel className="text-xs text-muted-foreground">Descrição</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Descrição do marco" className="h-8 text-sm" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 mt-5 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => removeMilestone(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>

                {/* Restrictions Section */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
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
                      Add
                    </Button>
                  </div>

                  <Card className="p-0 border-0 shadow-none bg-transparent">
                    <div className="space-y-3">
                      {restrictionFields.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg border-dashed bg-muted/30">
                          Nenhuma restrição definida
                        </div>
                      ) : (
                        restrictionFields.map((field, index) => (
                          <div key={field.id} className="flex gap-2 items-start bg-amber-500/5 p-3 rounded-lg border border-amber-500/20">
                            <div className="flex flex-col gap-1 shrink-0 w-32">
                              <div className="flex items-center gap-1">
                                <FormField
                                  control={form.control}
                                  name={`restrictions.${index}.week_start`}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <Input type="number" {...field} min={1} placeholder="Início" className="h-8 text-sm bg-white" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <span className="text-muted-foreground text-xs">-</span>
                                <FormField
                                  control={form.control}
                                  name={`restrictions.${index}.week_end`}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <Input
                                          type="number"
                                          {...field}
                                          value={field.value || ''}
                                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                          placeholder="Fim"
                                          className="h-8 text-sm bg-white"
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground text-center">Semanas (Início - Fim)</span>
                            </div>

                            <FormField
                              control={form.control}
                              name={`restrictions.${index}.description`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input {...field} placeholder="Descrição da restrição" className="h-[38px] text-sm bg-white" style={{ marginTop: 0 }} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 mt-1 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => removeRestriction(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>

              </div>
            </form>
          </Form>
        </ScrollArea>

        <div className="flex justify-end gap-2 p-6 pt-4 border-t shrink-0 bg-background/50 backdrop-blur-sm">
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
