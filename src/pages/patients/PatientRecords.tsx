import React from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { SOAPRecordEditor } from '@/components/patients/SOAPRecordEditor';
import { SOAPRecordsList } from '@/components/patients/SOAPRecordsList';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function PatientRecords() {
  const { id } = useParams<{ id: string }>();
  const { getPatient } = useData();
  const [showEditor, setShowEditor] = useState(false);
  
  const patient = id ? getPatient(id) : null;

  if (!id || !patient) {
    return (
      <MainLayout>
        <Card>
          <CardContent className="flex items-center gap-2 p-8">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p>Paciente não encontrado</p>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-bold">Prontuário Eletrônico</h1>
              <p className="text-muted-foreground">{patient.name}</p>
            </div>
          </div>
          <Button onClick={() => setShowEditor(true)}>
            Novo Prontuário
          </Button>
        </div>

        {showEditor && (
          <SOAPRecordEditor
            patientId={patient.id}
            onClose={() => setShowEditor(false)}
          />
        )}

        <SOAPRecordsList patientId={patient.id} />
      </div>
    </MainLayout>
  );
}