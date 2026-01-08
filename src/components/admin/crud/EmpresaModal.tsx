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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCreateEmpresaParceira, useUpdateEmpresaParceira } from '@/hooks/useEmpresasParceiras';
import type { EmpresaParceira } from '@/hooks/useEmpresasParceiras';

const empresaSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  contato: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  contrapartidas: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true),
});

type EmpresaFormData = z.infer<typeof empresaSchema>;

interface EmpresaModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresa?: EmpresaParceira;
}

export function EmpresaModal({ isOpen, onClose, empresa }: EmpresaModalProps) {
  const createMutation = useCreateEmpresaParceira();
  const updateMutation = useUpdateEmpresaParceira();
  const isEditing = !!empresa;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      ativo: true,
    },
  });

  const ativo = watch('ativo');

  useEffect(() => {
    if (empresa) {
      reset({
        nome: empresa.nome,
        contato: empresa.contato || '',
        email: empresa.email || '',
        telefone: empresa.telefone || '',
        contrapartidas: empresa.contrapartidas || '',
        observacoes: empresa.observacoes || '',
        ativo: empresa.ativo,
      });
    } else {
      reset({
        nome: '',
        contato: '',
        email: '',
        telefone: '',
        contrapartidas: '',
        observacoes: '',
        ativo: true,
      });
    }
  }, [empresa, reset]);

  const onSubmit = (data: EmpresaFormData) => {
    if (isEditing) {
      updateMutation.mutate(
        { id: empresa.id, data },
        {
          onSuccess: () => {
            onClose();
            reset();
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          onClose();
          reset();
        },
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Empresa Parceira' : 'Nova Empresa Parceira'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="nome">Nome da Empresa *</Label>
              <Input
                id="nome"
                {...register('nome')}
                placeholder="Nome da empresa"
              />
              {errors.nome && (
                <p className="text-sm text-destructive mt-1">{errors.nome.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contato">Pessoa de Contato</Label>
              <Input
                id="contato"
                {...register('contato')}
                placeholder="Nome do contato"
              />
            </div>

            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                {...register('telefone')}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="email@empresa.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="col-span-2">
              <Label htmlFor="contrapartidas">Contrapartidas</Label>
              <Textarea
                id="contrapartidas"
                {...register('contrapartidas')}
                placeholder="Descreva as contrapartidas acordadas..."
                rows={3}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                {...register('observacoes')}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>

            <div className="col-span-2 flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={ativo}
                onCheckedChange={(checked) => setValue('ativo', checked)}
              />
              <Label htmlFor="ativo">Empresa Ativa</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {isEditing ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
