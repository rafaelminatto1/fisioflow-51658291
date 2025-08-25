import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  Activity,
  Clock,
  Edit,
  AlertTriangle
} from 'lucide-react';
import { Patient } from '@/types';
import { useData } from '@/contexts/DataContext';

interface ViewPatientModalProps {
  patient: Patient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export function ViewPatientModal({ patient, open, onOpenChange, onEdit }: ViewPatientModalProps) {
  const { appointments } = useData();

  const getPatientAge = (birthDate: Date) => {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Em Tratamento':
        return 'bg-primary/10 text-primary';
      case 'Recuperação':
        return 'bg-secondary/10 text-secondary';
      case 'Inicial':
        return 'bg-muted text-muted-foreground';
      case 'Concluído':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const patientAppointments = appointments.filter(apt => apt.patientId === patient.id);
  const upcomingAppointments = patientAppointments.filter(apt => apt.date >= new Date());
  const completedAppointments = patientAppointments.filter(apt => apt.status === 'Realizado');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-foreground">
              Detalhes do Paciente
            </DialogTitle>
            <Button
              variant="outline"
              onClick={onEdit}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Editar
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl font-bold">
                    {patient.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-foreground">{patient.name}</h2>
                    <Badge className={getStatusColor(patient.status)}>
                      {patient.status}
                    </Badge>
                  </div>
                  <p className="text-lg text-muted-foreground">{getPatientAge(patient.birthDate)} anos • {patient.gender}</p>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Progresso: {patient.progress}%</span>
                    <div className="w-32 bg-muted rounded-full h-2 ml-2">
                      <div 
                        className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${patient.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{patient.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{patient.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                    <p className="font-medium">{patient.birthDate.toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Endereço</p>
                    <p className="font-medium">{patient.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Contato de Emergência</p>
                    <p className="font-medium">{patient.emergencyContact}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medical Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Informações Médicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Condição Principal</p>
                  <p className="font-medium bg-accent/50 p-3 rounded-lg">{patient.mainCondition}</p>
                </div>
                {patient.medicalHistory && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Histórico Médico</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{patient.medicalHistory}</p>
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cadastrado em:</span>
                  <span className="font-medium">{patient.createdAt.toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Última atualização:</span>
                  <span className="font-medium">{patient.updatedAt.toLocaleDateString('pt-BR')}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Appointments Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Resumo de Consultas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{patientAppointments.length}</p>
                  <p className="text-sm text-muted-foreground">Total de Consultas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary">{upcomingAppointments.length}</p>
                  <p className="text-sm text-muted-foreground">Próximas Consultas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{completedAppointments.length}</p>
                  <p className="text-sm text-muted-foreground">Consultas Realizadas</p>
                </div>
              </div>

              {upcomingAppointments.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Próximas Consultas</h4>
                  <div className="space-y-2">
                    {upcomingAppointments.slice(0, 3).map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{appointment.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.date.toLocaleDateString('pt-BR')} às {appointment.time}
                          </p>
                        </div>
                        <Badge variant="outline">{appointment.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}