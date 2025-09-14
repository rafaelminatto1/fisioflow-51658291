import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Administrativo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Resumo administrativo em breve.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
