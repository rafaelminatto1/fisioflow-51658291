/**
 * Strategic Analytics Page
 * Página principal de analytics estratégicos do FisioFlow
 */

import { StrategicDashboard } from '@/components/analytics/strategic';
import { useOrganization } from '@/hooks/useOrganization';
import { Loader2 } from 'lucide-react';

export default function StrategicAnalyticsPage() {
  const { data: organization, isLoading: orgLoading } = useOrganization();

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Estratégico</h1>
        <p className="text-muted-foreground">
          Insights inteligentes para otimizar ocupação, captação e receita da sua clínica
        </p>
      </div>

      <StrategicDashboard organizationId={organization?.id} />
    </div>
  );
}
