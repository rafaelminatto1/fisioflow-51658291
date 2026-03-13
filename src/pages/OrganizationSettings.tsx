import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

export default function OrganizationSettings() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configurações da Organização</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie as configurações da sua organização
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Esta funcionalidade está em desenvolvimento. Em breve você poderá configurar
              todos os aspectos da sua organização aqui.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}