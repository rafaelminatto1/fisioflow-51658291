import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePatients } from '@/hooks/usePatients';
import { User, Mail, Phone, MapPin, AlertTriangle, Calendar } from 'lucide-react';

interface ViewPatientModalProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ViewPatientModal = ({ patientId, isOpen, onClose }: ViewPatientModalProps) => {
  const { getPatient } = usePatients();
  const patient = getPatient(patientId);

  if (!patient) return null;

  const getAge = (birthDate: Date) => {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Inicial': 'bg-blue-100 text-blue-800',
      'Em Tratamento': 'bg-green-100 text-green-800',
      'Recuperação': 'bg-yellow-100 text-yellow-800',
      'Concluído': 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Perfil do Paciente
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{patient.name}</span>
                <Badge className={getStatusColor(patient.status)}>
                  {patient.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{getAge(patient.birthDate)} anos</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="capitalize">{patient.gender}</span>
                </div>
                {patient.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{patient.email}</span>
                  </div>
                )}
                {patient.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{patient.phone}</span>
                  </div>
                )}
              </div>
              
              {patient.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{patient.address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medical Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Médicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Condição Principal</h4>
                <p className="text-sm text-muted-foreground">{patient.mainCondition}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Progresso do Tratamento</h4>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${patient.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{patient.progress}%</span>
                </div>
              </div>

              {patient.medicalHistory && (
                <div>
                  <h4 className="font-medium mb-2">Histórico Médico</h4>
                  <p className="text-sm text-muted-foreground">{patient.medicalHistory}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          {patient.emergencyContact && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Contato de Emergência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{patient.emergencyContact}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};