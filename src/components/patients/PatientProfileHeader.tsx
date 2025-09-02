import React from 'react';
import { Patient } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Edit,
  FileText,
  Activity 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PatientProfileHeaderProps {
  patient: Patient;
}

export function PatientProfileHeader({ patient }: PatientProfileHeaderProps) {
  const getPatientAge = (birthDate: Date): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Em Tratamento': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Recuperação': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Inicial': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'Concluído': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src="" />
              <AvatarFallback className="text-lg">
                {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{patient.name}</h1>
                <Badge className={getStatusColor(patient.status)}>
                  {patient.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{getPatientAge(patient.birthDate)} anos</span>
                </div>
                
                {patient.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                
                {patient.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{patient.email}</span>
                  </div>
                )}
                
                {patient.address && (
                  <div className="flex items-center gap-2 md:col-span-3">
                    <MapPin className="h-4 w-4" />
                    <span>{patient.address}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm">Progresso: {patient.progress}%</span>
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${patient.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Prontuário
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Condição Principal</p>
            <p className="text-sm">{patient.mainCondition}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Data de Cadastro</p>
            <p className="text-sm">
              {format(patient.createdAt, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          
          {patient.emergencyContact && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contato de Emergência</p>
              <p className="text-sm">{patient.emergencyContact}</p>
            </div>
          )}
          
          {patient.insurancePlan && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Convênio</p>
              <p className="text-sm">{patient.insurancePlan}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}