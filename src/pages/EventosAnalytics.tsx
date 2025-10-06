import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EventosAnalytics } from '@/components/eventos/EventosAnalytics';

export default function EventosAnalyticsPage() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/eventos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Analytics de Eventos</h1>
            <p className="text-muted-foreground mt-1">
              Visualize métricas e estatísticas detalhadas dos seus eventos
            </p>
          </div>
        </div>

        {/* Analytics */}
        <EventosAnalytics />
      </div>
    </MainLayout>
  );
}
