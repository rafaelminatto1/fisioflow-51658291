import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  FileText,
  Heart,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PatientHelpers } from '@/types';

export const ViewPatientModal: React.FC<{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  patientId?: string
}> = ({ open, onOpenChange, patientId }) => {
  const navigate = useNavigate();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (!patientId) return null;

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!patientId
  });

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

  const getStatusColor = (status: string) => {
    const colors = {
      'active': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'inactive': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      'Inicial': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'Em Tratamento': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    };
    return colors[status as keyof typeof colors] || colors['active'];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalhes do Paciente
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !patient ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Paciente não encontrado</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Header with Avatar */}
              <div className="flex items-center gap-4 p-4 bg-accent/50 rounded-lg">
                <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                  {(() => {
                    const name = PatientHelpers.getName(patient);
                    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2);
                  })()}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{PatientHelpers.getName(patient)}</h3>
                  {patient.birth_date && (
                    <p className="text-sm text-muted-foreground">
                      {getAge(patient.birth_date)} anos • {format(new Date(patient.birth_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Badge className={getStatusColor(patient.status)}>
                  {patient.status}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/patients/${patientId}/evaluations/new`);
                  }}
                  className="gap-2 text-xs h-7"
                >
                  <FileText size={12} /> Avaliar
                </Button>
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Informações de Contato
              </h4>
              <div className="grid gap-3">
                {patient.email && (
                  <div className="flex items-center gap-2 text-sm p-3 bg-accent/30 rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.email}</span>
                  </div>
                )}
                {patient.phone && (
                  <div className="flex items-center gap-2 text-sm p-3 bg-accent/30 rounded-lg">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.emergency_contact && (
                  <div className="flex items-center gap-2 text-sm p-3 bg-accent/30 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="font-medium">Contato de Emergência</p>
                      <p className="text-muted-foreground">{patient.emergency_contact}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Address Information */}
            {(patient.address || patient.city || patient.state) && (
              <>
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço
                  </h4>
                  <div className="text-sm p-3 bg-accent/30 rounded-lg space-y-1">
                    {patient.address && <p>{patient.address}</p>}
                    {(patient.city || patient.state) && (
                      <p className="text-muted-foreground">
                        {[patient.city, patient.state].filter(Boolean).join(' - ')}
                      </p>
                    )}
                    {patient.zip_code && (
                      <p className="text-muted-foreground">CEP: {patient.zip_code}</p>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Health Insurance */}
            {patient.health_insurance && (
              <>
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Plano de Saúde
                  </h4>
                  <div className="text-sm p-3 bg-accent/30 rounded-lg space-y-1">
                    <p>{patient.health_insurance}</p>
                    {patient.insurance_number && (
                      <p className="text-muted-foreground">Número: {patient.insurance_number}</p>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Observations */}
            {patient.observations && (
              <>
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Observações
                  </h4>
                  <div className="text-sm p-3 bg-accent/30 rounded-lg">
                    <p className="whitespace-pre-wrap">{patient.observations}</p>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Registration Info */}
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>
                  Cadastrado em: {format(new Date(patient.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              {patient.updated_at && patient.updated_at !== patient.created_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Última atualização: {format(new Date(patient.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewPatientModal;
