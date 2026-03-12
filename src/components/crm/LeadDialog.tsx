import { useEffect, useState } from 'react';
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateLead, useUpdateLead, useDeleteLead, Lead } from '@/hooks/useLeads';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, UserPlus, Save, Loader2, Target, Phone, Mail, MessageSquare } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const ORIGENS = ['Instagram', 'Google', 'Indicação', 'Evento', 'Site', 'Facebook', 'WhatsApp', 'Telefone', 'Outro'];

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  estagios: { value: string; label: string; color: string }[];
}

export function LeadDialog({ open, onOpenChange, lead, estagios }: LeadDialogProps) {
  const isMobile = useIsMobile();
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
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
    <CustomModal 
      open={open} 
      onOpenChange={onOpenChange}
      isMobile={isMobile}
      contentClassName="max-w-lg"
    >
      <CustomModalHeader onClose={() => onOpenChange(false)}>
        <CustomModalTitle className="flex items-center gap-2">
          {lead ? <Save className="h-5 w-5 text-primary" /> : <UserPlus className="h-5 w-5 text-primary" />}
          {lead ? 'Editar Lead' : 'Novo Lead'}
        </CustomModalTitle>
      </CustomModalHeader>

      <CustomModalBody className="p-0 sm:p-0">
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lead-nome" className="font-semibold">Nome Completo *</Label>
            <Input
              id="lead-nome"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              required
              placeholder="Ex: João Silva"
              className="rounded-xl border-slate-200"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead-telefone" className="flex items-center gap-2 font-semibold">
                <Phone className="h-3 w-3" /> Telefone
              </Label>
              <Input
                id="lead-telefone"
                value={formData.telefone}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                placeholder="(00) 00000-0000"
                className="rounded-xl border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-email" className="flex items-center gap-2 font-semibold">
                <Mail className="h-3 w-3" /> Email
              </Label>
              <Input
                id="lead-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead-origem" className="font-semibold text-xs">Origem do Lead</Label>
              <Select value={formData.origem} onValueChange={(v) => setFormData(prev => ({ ...prev, origem: v }))}>
                <SelectTrigger id="lead-origem" className="rounded-xl border-slate-200">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {ORIGENS.map(o => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-interesse" className="flex items-center gap-2 font-semibold">
                <Target className="h-3 w-3" /> Interesse
              </Label>
              <Input
                id="lead-interesse"
                value={formData.interesse}
                onChange={(e) => setFormData(prev => ({ ...prev, interesse: e.target.value }))}
                placeholder="Ex: Pilates, Reabilitação"
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-estagio" className="font-semibold">Estágio no Funil</Label>
            <Select 
              value={formData.estagio} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, estagio: v as Lead['estagio'] }))}
            >
              <SelectTrigger id="lead-estagio" className="rounded-xl border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {estagios.map(e => (
                  <SelectItem key={e.value} value={e.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2.5 h-2.5 rounded-full", e.color)} />
                      {e.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.estagio === 'nao_efetivado' && (
            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
              <Label htmlFor="lead-motivo" className="text-destructive font-semibold">Motivo da não efetivação</Label>
              <Input
                id="lead-motivo"
                value={formData.motivo_nao_efetivacao}
                onChange={(e) => setFormData(prev => ({ ...prev, motivo_nao_efetivacao: e.target.value }))}
                placeholder="Ex: Preço elevado, distância, falta de horário"
                className="rounded-xl border-destructive/20 focus-visible:ring-destructive"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="lead-observacoes" className="flex items-center gap-2 font-semibold">
              <MessageSquare className="h-3 w-3" /> Observações Internas
            </Label>
            <Textarea
              id="lead-observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Anotações relevantes sobre as interações com o lead..."
              rows={3}
              className="rounded-xl border-slate-200 resize-none"
            />
          </div>
        </div>
      </CustomModalBody>

      <CustomModalFooter isMobile={isMobile}>
        {lead && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" type="button" className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl mr-auto">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Lead
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o lead "{lead.nome}"? Esta ação removerá todo o histórico e não poderá ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                  Sim, Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="rounded-xl">
          Cancelar
        </Button>
        <Button 
          type="button" 
          onClick={() => handleSubmit()} 
          disabled={isPending || !formData.nome}
          className="rounded-xl px-8 bg-slate-900 text-white hover:bg-slate-800 gap-2 shadow-lg"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            lead ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />
          )}
          {lead ? 'Salvar Alterações' : 'Cadastrar Lead'}
        </Button>
      </CustomModalFooter>
    </CustomModal>
  );
}
