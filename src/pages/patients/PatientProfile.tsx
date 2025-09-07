import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PatientProfileHeader } from '@/components/patients/PatientProfileHeader';
import { PatientProfileTabs } from '@/components/patients/PatientProfileTabs';
import { useData } from '@/hooks/useData';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const { getPatient } = useData();
  
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
        <PatientProfileHeader patient={patient} />
        <PatientProfileTabs patient={patient} />
      </div>
    </MainLayout>
  );
}