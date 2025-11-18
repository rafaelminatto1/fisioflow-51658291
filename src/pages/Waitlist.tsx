import { MainLayout } from '@/components/layout/MainLayout';
import { WaitlistManager } from '@/components/waitlist/WaitlistManager';

export default function Waitlist() {
  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Lista de Espera</h1>
          <p className="text-muted-foreground">
            Gerencie pacientes aguardando vagas disponíveis
          </p>
        </div>
        
        <WaitlistManager />
      </div>
    </MainLayout>
  );
}
