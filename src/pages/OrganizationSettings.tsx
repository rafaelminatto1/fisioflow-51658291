import { MainLayout } from '@/components/layout/MainLayout';
import { OrganizationManager } from '@/components/admin/OrganizationManager';

const OrganizationSettings = () => {
  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Configurações da Organização</h1>
          <p className="text-muted-foreground">
            Gerencie sua clínica, membros e configurações
          </p>
        </div>
        
        <OrganizationManager />
      </div>
    </MainLayout>
  );
};

export default OrganizationSettings;
