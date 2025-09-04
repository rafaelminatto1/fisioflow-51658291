import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { useTreatmentSessions } from '@/hooks/useTreatmentSessions';
import { useExercisePlans } from '@/hooks/useExercisePlans';
import { useToast } from '@/hooks/use-toast';
import { Activity, Plus } from 'lucide-react';

interface TreatmentSessionModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  appointmentId?: string;
  patientId?: string;
}

export function TreatmentSessionModal({ trigger, open, onOpenChange, appointmentId, patientId }: TreatmentSessionModalProps) {
  const { patients } = useData();
  const { addTreatmentSession } = useTreatmentSessions();
  const { exercisePlans } = useExercisePlans();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: patientId || '',
    appointment_id: appointmentId || '',
    exercise_plan_id: '',
    observations: '',
    pain_level: 5,
    evolution_notes: '',
    next_session_goals: ''
  });

  const modalOpen = open !== undefined ? open : isOpen;
  const setModalOpen = onOpenChange || setIsOpen;

  const patientExercisePlans = exercisePlans.filter(plan => plan.patient_id === formData.patient_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patient_id || !formData.observations) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addTreatmentSession({
        patient_id: formData.patient_id,
        therapist_id: 'temp_therapist_id',
        session_type: 'treatment',
        session_date: new Date().toISOString(),
        duration_minutes: 60,
        pain_level_before: formData.pain_level,
        pain_level_after: formData.pain_level,
        functional_score_before: 50,
        functional_score_after: 50,
        exercises_performed: [],
        observations: formData.observations,
        next_session_date: undefined,
        status: 'completed'
      });
      
      toast({
        title: "Sucesso",
        description: "Sessão de tratamento registrada com sucesso!",
      });

      setFormData({
        patient_id: patientId || '',
        appointment_id: appointmentId || '',
        exercise_plan_id: '',
        observations: '',
        pain_level: 5,
        evolution_notes: '',
        next_session_goals: ''
      });
      setModalOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao registrar sessão de tratamento.",
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
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Registro de Sessão de Tratamento
          </DialogTitle>
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
              <label className="text-sm font-medium">Nível de Dor (0-10) *</label>
              <Input 
                type="number"
                min="0"
                max="10"
                value={formData.pain_level}
                onChange={(e) => setFormData(prev => ({ ...prev, pain_level: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          
          {formData.patient_id && patientExercisePlans.length > 0 && (
            <div>
              <label className="text-sm font-medium">Plano de Exercícios</label>
              <Select value={formData.exercise_plan_id} onValueChange={(value) => setFormData(prev => ({ ...prev, exercise_plan_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum plano selecionado</SelectItem>
                  {patientExercisePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium">Observações da Sessão *</label>
            <Textarea 
              value={formData.observations}
              onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
              placeholder="Descreva como foi a sessão, exercícios realizados, comportamento do paciente..."
              rows={3}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Notas de Evolução</label>
            <Textarea 
              value={formData.evolution_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, evolution_notes: e.target.value }))}
              placeholder="Progresso observado, melhorias, dificuldades..."
              rows={3}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Objetivos para Próxima Sessão</label>
            <Textarea 
              value={formData.next_session_goals}
              onChange={(e) => setFormData(prev => ({ ...prev, next_session_goals: e.target.value }))}
              placeholder="Metas e focos para a próxima sessão..."
              rows={2}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              <Plus className="w-4 h-4 mr-2" />
              Registrar Sessão
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}