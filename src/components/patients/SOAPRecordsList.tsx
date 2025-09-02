import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSOAPRecords } from '@/hooks/useSOAPRecords';
import { 
  FileText, 
  Edit, 
  Eye, 
  Printer, 
  Calendar,
  User,
  FileSignature
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SOAPRecordsListProps {
  patientId: string;
}

export function SOAPRecordsList({ patientId }: SOAPRecordsListProps) {
  const { records, loading, getRecordsByPatient } = useSOAPRecords();
  
  const patientRecords = getRecordsByPatient(patientId);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Carregando prontuários...</p>
        </CardContent>
      </Card>
    );
  }

  if (patientRecords.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Nenhum prontuário encontrado. Crie o primeiro prontuário SOAP para este paciente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {patientRecords.map((record) => (
        <Card key={record.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <span className="text-sm font-medium text-primary">
                    {record.sessionNumber}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-base">
                    Sessão {record.sessionNumber}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(record.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Profissional
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {record.signedAt && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <FileSignature className="h-3 w-3 mr-1" />
                    Assinado
                  </Badge>
                )}
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {record.subjective && (
                <div>
                  <h4 className="text-sm font-medium text-primary mb-1">Subjetivo</h4>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {record.subjective}
                  </p>
                </div>
              )}
              
              {record.objective && (
                <div>
                  <h4 className="text-sm font-medium text-primary mb-1">Objetivo</h4>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {typeof record.objective === 'string' 
                      ? record.objective 
                      : record.objective?.findings || 'Dados do exame físico registrados'
                    }
                  </p>
                </div>
              )}
              
              {record.assessment && (
                <div>
                  <h4 className="text-sm font-medium text-primary mb-1">Avaliação</h4>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {record.assessment}
                  </p>
                </div>
              )}
              
              {record.plan && (
                <div>
                  <h4 className="text-sm font-medium text-primary mb-1">Plano</h4>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {typeof record.plan === 'string' 
                      ? record.plan 
                      : record.plan?.treatment || 'Plano de tratamento definido'
                    }
                  </p>
                </div>
              )}
            </div>
            
            {record.vitalSigns && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Sinais Vitais</h4>
                <div className="flex gap-4 text-sm">
                  {record.vitalSigns.bloodPressure && (
                    <span>PA: {record.vitalSigns.bloodPressure}</span>
                  )}
                  {record.vitalSigns.heartRate && (
                    <span>FC: {record.vitalSigns.heartRate}</span>
                  )}
                  {record.vitalSigns.temperature && (
                    <span>Temp: {record.vitalSigns.temperature}</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}