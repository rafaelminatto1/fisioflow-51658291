import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { useExercisePlans } from '@/hooks/useExercisePlans';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface NewExercisePlanModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewExercisePlanModal({ trigger, open, onOpenChange }: NewExercisePlanModalProps) {
  const { patients } = useData();
  const { addExercisePlan } = useExercisePlans();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    patient_id: '',
    status: 'Ativo' as const
  });

  const modalOpen = open !== undefined ? open : isOpen;
  const setModalOpen = onOpenChange || setIsOpen;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.patient_id) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addExercisePlan(formData);
      
      toast({
        title: "Sucesso",
        description: "Plano de exercícios criado com sucesso!",
      });

      setFormData({
        name: '',
        description: '',
        patient_id: '',
        status: 'Ativo'
      });
      setModalOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar plano de exercícios.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Plano de Exercícios</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Paciente *</label>
              <Select value={formData.patient_id} onValueChange={(value) => setFormData(prev => ({ ...prev, patient_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={formData.status} onValueChange={(value: 'Ativo' | 'Inativo' | 'Concluído') => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Nome do Plano *</label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Protocolo Lombalgia - João Silva"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Textarea 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva os objetivos e metodologia do plano..."
              rows={4}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              <Plus className="w-4 h-4 mr-2" />
              Criar Plano
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}