import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

  Dialog,
  DialogContent,
  DialogDescription,
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
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, Calendar, Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PathologyService } from '@/lib/services/pathologyService';
import type { Pathology, PathologyFormData } from '@/types/evolution';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  pathology_name: z.string().min(2, 'Nome da patologia é obrigatório'),
  cid_code: z.string().optional(),
  diagnosis_date: z.string().optional(),
  severity: z.enum(['leve', 'moderada', 'grave']).optional(),
  affected_region: z.string().optional(),
  status: z.enum(['em_tratamento', 'tratada', 'cronica']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PathologyFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  pathology?: Pathology | null;
  onSuccess?: () => void;
}

// Lista comum de CIDs para fisioterapia
const COMMON_CIDS = [
  { code: 'M54.5', name: 'Dor lombar baixa' },
  { code: 'M54.2', name: 'Cervicalgia' },
  { code: 'M75.1', name: 'Síndrome do manguito rotador' },
  { code: 'M23.5', name: 'Instabilidade crônica do joelho' },
  { code: 'S83.5', name: 'Entorse e distensão do LCA' },
  { code: 'S83.4', name: 'Entorse e distensão do menisco' },
  { code: 'M17.1', name: 'Gonartrose primária' },
  { code: 'M16.1', name: 'Coxartrose primária' },
  { code: 'M51.1', name: 'Hérnia de disco lombar' },
  { code: 'M50.1', name: 'Hérnia de disco cervical' },
  { code: 'G56.0', name: 'Síndrome do túnel do carpo' },
  { code: 'M77.1', name: 'Epicondilite lateral' },
  { code: 'M77.0', name: 'Epicondilite medial' },
  { code: 'M76.6', name: 'Tendinite de Aquiles' },
  { code: 'M72.2', name: 'Fasciite plantar' },
  { code: 'M79.3', name: 'Paniculite' },
  { code: 'M62.8', name: 'Outros transtornos musculares especificados' },
  { code: 'S93.4', name: 'Entorse do tornozelo' },
  { code: 'S43.4', name: 'Entorse do ombro' },
  { code: 'M25.5', name: 'Dor articular' },
];

const AFFECTED_REGIONS = [
  { value: 'coluna_cervical', label: 'Coluna Cervical' },
  { value: 'coluna_toracica', label: 'Coluna Torácica' },
  { value: 'coluna_lombar', label: 'Coluna Lombar' },
  { value: 'ombro_direito', label: 'Ombro Direito' },
  { value: 'ombro_esquerdo', label: 'Ombro Esquerdo' },
  { value: 'cotovelo_direito', label: 'Cotovelo Direito' },
  { value: 'cotovelo_esquerdo', label: 'Cotovelo Esquerdo' },
  { value: 'punho_mao_direito', label: 'Punho/Mão Direito' },
  { value: 'punho_mao_esquerdo', label: 'Punho/Mão Esquerdo' },
  { value: 'quadril_direito', label: 'Quadril Direito' },
  { value: 'quadril_esquerdo', label: 'Quadril Esquerdo' },
  { value: 'joelho_direito', label: 'Joelho Direito' },
  { value: 'joelho_esquerdo', label: 'Joelho Esquerdo' },
  { value: 'tornozelo_pe_direito', label: 'Tornozelo/Pé Direito' },
  { value: 'tornozelo_pe_esquerdo', label: 'Tornozelo/Pé Esquerdo' },
  { value: 'global', label: 'Global / Sistêmico' },
];

const SEVERITY_OPTIONS = [
  { value: 'leve', label: 'Leve', color: 'bg-green-500/10 text-green-600' },
  { value: 'moderada', label: 'Moderada', color: 'bg-yellow-500/10 text-yellow-600' },
  { value: 'grave', label: 'Grave', color: 'bg-red-500/10 text-red-600' },
];

const STATUS_OPTIONS = [
  { value: 'em_tratamento', label: 'Em Tratamento', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'tratada', label: 'Tratada', color: 'bg-green-500/10 text-green-600' },
  { value: 'cronica', label: 'Crônica', color: 'bg-purple-500/10 text-purple-600' },
];

export const PathologyFormModal: React.FC<PathologyFormModalProps> = ({
  open,
  onOpenChange,
  patientId,
  pathology,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!pathology;
  const [cidOpen, setCidOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pathology_name: '',
      cid_code: '',
      diagnosis_date: '',
      severity: undefined,
      affected_region: '',
      status: 'em_tratamento',
      notes: '',
    },
  });

  useEffect(() => {
    if (pathology) {
      form.reset({
        pathology_name: pathology.pathology_name || '',
        cid_code: pathology.cid_code || '',
        diagnosis_date: pathology.diagnosis_date || '',
        severity: (pathology.severity as FormValues['severity']) || undefined,
        affected_region: pathology.affected_region || '',
        status: (pathology.status as FormValues['status']) || 'em_tratamento',
        notes: pathology.notes || '',
      });
    } else {
      form.reset({
        pathology_name: '',
        cid_code: '',
        diagnosis_date: '',
        severity: undefined,
        affected_region: '',
        status: 'em_tratamento',
        notes: '',
      });
    }
  }, [pathology, form, open]);

  const createMutation = useMutation({
    mutationFn: (data: PathologyFormData) => PathologyService.addPathology(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-pathologies', patientId] });
      toast.success('Patologia registrada com sucesso');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error('Erro ao registrar patologia');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PathologyFormData> }) =>
      PathologyService.updatePathology(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-pathologies', patientId] });
      toast.success('Patologia atualizada com sucesso');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error('Erro ao atualizar patologia');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => PathologyService.deletePathology(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-pathologies', patientId] });
      toast.success('Patologia removida com sucesso');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error('Erro ao remover patologia');
    },
  });

  const onSubmit = (values: FormValues) => {
    const data: PathologyFormData = {
      patient_id: patientId,
      pathology_name: values.pathology_name,
      cid_code: values.cid_code || null,
      diagnosis_date: values.diagnosis_date || null,
      severity: values.severity || null,
      affected_region: values.affected_region || null,
      status: values.status,
      notes: values.notes || null,
    };

    if (isEditing && pathology) {
      updateMutation.mutate({ id: pathology.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (pathology && confirm('Tem certeza que deseja remover esta patologia?')) {
      deleteMutation.mutate(pathology.id);
    }
  };

  const handleCidSelect = (cid: typeof COMMON_CIDS[0]) => {
    form.setValue('cid_code', cid.code);
    form.setValue('pathology_name', cid.name);
    setCidOpen(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {isEditing ? 'Editar Patologia' : 'Nova Patologia'}
          </DialogTitle>
          <DialogDescription>
            Registre o diagnóstico e acompanhe o status da condição do paciente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* CID Autocomplete */}
            <div className="space-y-2">
              <FormLabel>CID (busca rápida)</FormLabel>
              <Popover open={cidOpen} onOpenChange={setCidOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={cidOpen}
                    className="w-full justify-between"
                  >
                    {form.watch('cid_code')
                      ? `${form.watch('cid_code')} - ${form.watch('pathology_name')}`
                      : 'Buscar por CID...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Digite o CID ou nome..." />
                    <CommandList>
                      <CommandEmpty>Nenhum CID encontrado.</CommandEmpty>
                      <CommandGroup>
                        {COMMON_CIDS.map((cid) => (
                          <CommandItem
                            key={cid.code}
                            value={`${cid.code} ${cid.name}`}
                            onSelect={() => handleCidSelect(cid)}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                form.watch('cid_code') === cid.code
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            <span className="font-mono text-xs mr-2">{cid.code}</span>
                            <span>{cid.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pathology_name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome da Patologia *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Síndrome do Manguito Rotador" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cid_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código CID</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: M75.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="diagnosis_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Data do Diagnóstico
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="affected_region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Região Afetada
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AFFECTED_REGIONS.map((region) => (
                          <SelectItem key={region.value} value={region.value}>
                            {region.label}
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
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SEVERITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <Badge variant="outline" className={option.color}>
                              {option.label}
                            </Badge>
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
                name="status"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <Badge variant="outline" className={option.color}>
                              {option.label}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Define se a condição está ativa, foi tratada ou é crônica.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Observações Clínicas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detalhes sobre a condição, histórico, tratamentos anteriores..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  Excluir
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : isEditing ? (
                  'Salvar Alterações'
                ) : (
                  'Registrar Patologia'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
