import { useState, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePatients } from '@/hooks/usePatients';

interface NewPatientModalProps {
  trigger: ReactNode;
}

export const NewPatientModal = ({ trigger }: NewPatientModalProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addPatient } = usePatients();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      await addPatient({
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        birthDate: new Date(formData.get('birthDate') as string),
        gender: formData.get('gender') as 'masculino' | 'feminino' | 'outro',
        mainCondition: formData.get('mainCondition') as string,
        status: 'Inicial',
        progress: 0,
        address: formData.get('address') as string,
        emergencyContact: formData.get('emergencyContact') as string,
        medicalHistory: formData.get('medicalHistory') as string
      });
      
      setOpen(false);
      toast({
        title: 'Paciente adicionado!',
        description: 'O paciente foi cadastrado com sucesso.'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível cadastrar o paciente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Paciente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" />
            </div>
            <div>
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input id="birthDate" name="birthDate" type="date" />
            </div>
            <div>
              <Label htmlFor="gender">Gênero</Label>
              <select id="gender" name="gender" className="w-full p-2 border rounded">
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <Label htmlFor="mainCondition">Condição Principal</Label>
              <Input id="mainCondition" name="mainCondition" />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" name="address" />
          </div>
          <div>
            <Label htmlFor="emergencyContact">Contato de Emergência</Label>
            <Input id="emergencyContact" name="emergencyContact" />
          </div>
          <div>
            <Label htmlFor="medicalHistory">Histórico Médico</Label>
            <textarea 
              id="medicalHistory" 
              name="medicalHistory" 
              className="w-full p-2 border rounded h-20"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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