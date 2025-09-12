import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePatient, useUpdatePatient } from '@/hooks/usePatients';

interface EditPatientModalProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const EditPatientModal = ({ patientId, isOpen, onClose }: EditPatientModalProps) => {
  const [loading, setLoading] = useState(false);
  const { data: patient } = usePatient(patientId);
  const updatePatient = useUpdatePatient();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      await updatePatient.mutateAsync({
        patientId,
        updates: {
          name: formData.get('name') as string,
          email: formData.get('email') as string,
          phone: formData.get('phone') as string,
          mainCondition: formData.get('mainCondition') as string,
          address: formData.get('address') as string,
          emergencyContact: formData.get('emergencyContact') as string,
          medicalHistory: formData.get('medicalHistory') as string
        }
      });
      
      onClose();
      toast({
        title: 'Paciente atualizado!',
        description: 'Os dados do paciente foram salvos com sucesso.'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o paciente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Paciente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" defaultValue={patient.name} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={patient.email} />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={patient.phone} />
            </div>
            <div>
              <Label htmlFor="mainCondition">Condição Principal</Label>
              <Input id="mainCondition" name="mainCondition" defaultValue={patient.mainCondition} />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" name="address" defaultValue={patient.address} />
          </div>
          <div>
            <Label htmlFor="emergencyContact">Contato de Emergência</Label>
            <Input id="emergencyContact" name="emergencyContact" defaultValue={patient.emergencyContact} />
          </div>
          <div>
            <Label htmlFor="medicalHistory">Histórico Médico</Label>
            <textarea 
              id="medicalHistory" 
              name="medicalHistory" 
              className="w-full p-2 border rounded h-20"
              defaultValue={patient.medicalHistory}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};