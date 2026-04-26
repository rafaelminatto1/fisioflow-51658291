import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

const mockData = [
  { week: 'S1', adherence: 40, recovery: 10 },
  { week: 'S2', adherence: 55, recovery: 25 },
  { week: 'S3', adherence: 70, recovery: 45 },
  { week: 'S4', adherence: 85, recovery: 70 },
];

export function RetentionROI() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Adesão ao HEP vs. Recuperação Clínica</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="adherence" stroke="#10b981" name="Adesão (%)" strokeWidth={2} />
              <Line type="monotone" dataKey="recovery" stroke="#3b82f6" name="Melhora Dor (%)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader><CardTitle className="text-sm text-emerald-800">Churn Risk (Previsão)</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-emerald-900">12%</p><p className="text-xs text-emerald-700/70">Pacientes abaixo da meta de adesão.</p></CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardHeader><CardTitle className="text-sm text-blue-800">Receita por Engajado</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-blue-900">R$ 1.240</p><p className="text-xs text-blue-700/70">Média de pacientes engajados vs R$ 850 (outros).</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
