import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PatientForm } from '@/components/patients/PatientForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';

export default function PatientNew() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <UserPlus className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Novo Paciente</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cadastro Completo de Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <PatientForm />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}