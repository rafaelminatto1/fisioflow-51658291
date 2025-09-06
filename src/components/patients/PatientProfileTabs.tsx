import React from 'react';
import { Patient } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MedicalTimeline } from './MedicalTimeline';
import { PatientDocuments } from './PatientDocuments';
import { 
  User, 
  Heart, 
  Calendar, 
  CreditCard,
  Activity,
  Pill,
  AlertCircle
} from 'lucide-react';

interface PatientProfileTabsProps {
  patient: Patient;
}

export function PatientProfileTabs({ patient }: PatientProfileTabsProps) {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Resumo</TabsTrigger>
        <TabsTrigger value="medical">Dados Médicos</TabsTrigger>
        <TabsTrigger value="appointments">Consultas</TabsTrigger>
        <TabsTrigger value="exercises">Exercícios</TabsTrigger>
        <TabsTrigger value="documents">Documentos</TabsTrigger>
        <TabsTrigger value="financial">Financeiro</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dados Pessoais</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              {patient.cpf && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">CPF:</span>
                  <span className="text-sm">{patient.cpf}</span>
                </div>
              )}
              {patient.rg && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">RG:</span>
                  <span className="text-sm">{patient.rg}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Gênero:</span>
                <span className="text-sm capitalize">{patient.gender}</span>
              </div>
              {patient.maritalStatus && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Estado Civil:</span>
                  <span className="text-sm capitalize">{patient.maritalStatus}</span>
                </div>
              )}
              {patient.profession && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Profissão:</span>
                  <span className="text-sm">{patient.profession}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Informações Médicas</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              {patient.bloodType && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tipo Sanguíneo:</span>
                  <span className="text-sm">{patient.bloodType}</span>
                </div>
              )}
              {patient.weight && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Peso:</span>
                  <span className="text-sm">{patient.weight} kg</span>
                </div>
              )}
              {patient.height && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Altura:</span>
                  <span className="text-sm">{patient.height} cm</span>
                </div>
              )}
              {patient.allergies && (
                <div>
                  <span className="text-sm text-muted-foreground">Alergias:</span>
                  <p className="text-sm mt-1">{patient.allergies}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Timeline de Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MedicalTimeline patientId={patient.id} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="medical" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patient.medicalHistory && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico Médico</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{patient.medicalHistory}</p>
              </CardContent>
            </Card>
          )}

          {patient.medications && (
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Medicamentos em Uso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{patient.medications}</p>
              </CardContent>
            </Card>
          )}

          {patient.allergies && (
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Alergias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{patient.allergies}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Condição Principal</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="mb-2">
                {patient.mainCondition}
              </Badge>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso do Tratamento:</span>
                  <span>{patient.progress}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${patient.progress}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="appointments" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Histórico de Consultas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Implementar lista de consultas do paciente
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="exercises" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Planos de Exercícios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Implementar lista de exercícios prescritos
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="documents" className="space-y-4">
        <PatientDocuments patientId={patient.id} />
      </TabsContent>

      <TabsContent value="financial" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Histórico Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Implementar histórico de pagamentos
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}