import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import { useCreateLead, useUpdateLead, useDeleteLead, Lead } from '@/hooks/useLeads';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/shared/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

const ORIGENS = ['Instagram', 'Google', 'Indicação', 'Evento', 'Site', 'Facebook', 'WhatsApp', 'Telefone', 'Outro'];

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  estagios: { value: string; label: string; color: string }[];
}

export function LeadDialog({ open, onOpenChange, lead, estagios }: LeadDialogProps) {
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    origem: '',
    interesse: '',
    observacoes: '',
    estagio: 'aguardando' as Lead['estagio'],
    motivo_nao_efetivacao: '',
  });

  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const deleteMutation = useDeleteLead();

  useEffect(() => {
    if (lead) {
      setFormData({
        nome: lead.nome,
        telefone: lead.telefone || '',
        email: lead.email || '',
        origem: lead.origem || '',
        interesse: lead.interesse || '',
        observacoes: lead.observacoes || '',
        estagio: lead.estagio,
        motivo_nao_efetivacao: lead.motivo_nao_efetivacao || '',
      });
    } else {
      setFormData({
        nome: '',
        telefone: '',
        email: '',
        origem: '',
        interesse: '',
        observacoes: '',
        estagio: 'aguardando',
        motivo_nao_efetivacao: '',
      });
    }
  }, [lead, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (lead) {
      await updateMutation.mutateAsync({ id: lead.id, ...formData });
    } else {
      await createMutation.mutateAsync({
        ...formData,
        data_primeiro_contato: new Date().toISOString().split('T')[0],
        data_ultimo_contato: null,
        responsavel_id: null,
      });
    }
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (lead) {
      await deleteMutation.mutateAsync(lead.id);
      onOpenChange(false);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              required
              placeholder="Nome completo"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origem">Origem</Label>
              <Select value={formData.origem} onValueChange={(v) => setFormData(prev => ({ ...prev, origem: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  {ORIGENS.map(o => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interesse">Interesse</Label>
              <Input
                id="interesse"
                value={formData.interesse}
                onChange={(e) => setFormData(prev => ({ ...prev, interesse: e.target.value }))}
                placeholder="Ex: Pilates, Fisioterapia"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estagio">Estágio</Label>
            <Select 
              value={formData.estagio} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, estagio: v as Lead['estagio'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {estagios.map(e => (
                  <SelectItem key={e.value} value={e.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${e.color}`} />
                      {e.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.estagio === 'nao_efetivado' && (
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da não efetivação</Label>
              <Input
                id="motivo"
                value={formData.motivo_nao_efetivacao}
                onChange={(e) => setFormData(prev => ({ ...prev, motivo_nao_efetivacao: e.target.value }))}
                placeholder="Ex: Preço, localização, horário"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Anotações sobre o lead..."
              rows={3}
            />
          </div>

          <DialogFooter className="flex justify-between gap-2">
            {lead && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" type="button">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir o lead "{lead.nome}"? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Salvando...' : lead ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
