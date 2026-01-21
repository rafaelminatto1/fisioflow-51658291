import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Avatar, AvatarFallback } from '@/components/shared/ui/avatar';
import { Alert, AlertDescription } from '@/components/shared/ui/alert';
import {
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Activity,
  FileText,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  usePatientSurgeries,
  usePatientGoals,
  usePatientPathologies
} from '@/hooks/usePatientEvolution';
import { useSoapRecords } from '@/hooks/useSoapRecords';
import { PatientHelpers } from '@/types';

interface PatientDashboard360Props {
  patient: {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
    birth_date?: string;
    address?: string;
    city?: string;
    state?: string;
  };
  upcomingAppointments?: Array<{
    id: string;
    date: Date | string;
    time: string;
    type: string;
    status: string;
  }>;
}

export const PatientDashboard360: React.FC<PatientDashboard360Props> = ({
  patient,
  upcomingAppointments = []
}) => {
  const { data: surgeries = [] } = usePatientSurgeries(patient.id);
  const { data: goals = [] } = usePatientGoals(patient.id);
  const { data: pathologies = [] } = usePatientPathologies(patient.id);
  const { data: soapRecords = [] } = useSoapRecords(patient.id, 5);

  const activeGoals = goals.filter(g => g.status === 'em_andamento');
  const activePathologies = pathologies.filter(p => p.status === 'em_tratamento');
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-6">
      {/* Header Card - Informações Principais */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24 border-2 border-primary">
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials(PatientHelpers.getName(patient))}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-3xl font-bold">{PatientHelpers.getName(patient)}</h2>
                <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {getAge(patient.birth_date)} anos
                  </span>
                  {patient.gender && (
                    <span>{patient.gender === 'M' ? 'Masculino' : 'Feminino'}</span>
                  )}
                  <Badge variant={patient.status === 'active' ? 'default' : 'secondary'}>
                    {patient.status === 'active' ? 'Ativo' : patient.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {patient.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{patient.email}</span>
                  </div>
                )}
                {patient.city && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{patient.city}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Cards de Informação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cirurgias Recentes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Cirurgias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {surgeries.length > 0 ? (
              <div className="space-y-2">
                {surgeries.slice(0, 2).map((surgery) => (
                  <div key={surgery.id} className="text-sm">
                    <p className="font-medium">{surgery.surgery_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(surgery.surgery_date), 'dd/MM/yyyy')} - {surgery.affected_side}
                    </p>
                  </div>
                ))}
                {surgeries.length > 2 && (
                  <p className="text-xs text-muted-foreground">
                    +{surgeries.length - 2} cirurgia(s)
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma cirurgia registrada</p>
            )}
          </CardContent>
        </Card>

        {/* Objetivos Ativos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Objetivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeGoals.length > 0 ? (
              <div className="space-y-2">
                {activeGoals.slice(0, 2).map((goal) => (
                  <div key={goal.id} className="text-sm">
                    <p className="font-medium truncate">{goal.goal_title}</p>
                    {goal.target_date && (
                      <p className="text-xs text-muted-foreground">
                        Meta: {format(new Date(goal.target_date), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                ))}
                {activeGoals.length > 2 && (
                  <p className="text-xs text-muted-foreground">
                    +{activeGoals.length - 2} objetivo(s)
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum objetivo ativo</p>
            )}
          </CardContent>
        </Card>

        {/* Patologias Ativas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Patologias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activePathologies.length > 0 ? (
              <div className="space-y-2">
                {activePathologies.slice(0, 2).map((pathology) => (
                  <div key={pathology.id} className="text-sm">
                    <p className="font-medium">{pathology.pathology_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {pathology.status.replace('_', ' ')}
                    </p>
                  </div>
                ))}
                {activePathologies.length > 2 && (
                  <p className="text-xs text-muted-foreground">
                    +{activePathologies.length - 2} patologia(s)
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma patologia ativa</p>
            )}
          </CardContent>
        </Card>

        {/* Próximos Agendamentos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Próximas Sessões
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-2">
                {upcomingAppointments.slice(0, 2).map((apt) => (
                  <div key={apt.id} className="text-sm">
                    <p className="font-medium">
                      {format(new Date(apt.appointment_date), 'dd/MM/yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {apt.appointment_time} - {apt.type}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem agendamentos próximos</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline de Evoluções Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Evoluções Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {soapRecords.length > 0 ? (
            <div className="space-y-4">
              {soapRecords.map((record) => (
                <div key={record.id} className="flex gap-4 pb-4 border-b last:border-0">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {format(new Date(record.record_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(record.created_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>
                    </div>
                    {record.assessment && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {record.assessment}
                      </p>
                    )}
                    {record.signed_at && (
                      <Badge variant="secondary" className="text-xs">
                        Assinado
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma evolução registrada ainda
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alertas e Lembretes */}
      {(activeGoals.length === 0 || soapRecords.length === 0) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong>{' '}
            {activeGoals.length === 0 && 'Configure objetivos para este paciente. '}
            {soapRecords.length === 0 && 'Registre a primeira evolução para iniciar o acompanhamento.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
