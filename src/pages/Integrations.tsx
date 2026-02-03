/**
 * Integrations Page - Dashboard de integrações
 * Gerencia conexões com serviços terceiros
 */

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Plus,
  Settings,
  RefreshCw,
} from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { IntegrationConfig } from '@/components/integrations/IntegrationConfig';

import type { Integration, IntegrationProvider } from '@/types/integrations';

interface ProviderInfo {
  id: IntegrationProvider;
  name: string;
  description: string;
  icon: string;
  category: string;
  isConfigured: boolean;
}

const mockProviders: ProviderInfo[] = [
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sincronize agendamentos bidirecionalmente',
    icon: '📅',
    category: 'Agenda',
    isConfigured: false,
  },
  {
    id: 'zoom',
    name: 'Zoom Meetings',
    description: 'Crie salas para telemedicina automaticamente',
    icon: '📹',
    category: 'Telemedicina',
    isConfigured: false,
  },
  {
    id: 'stripe',
    name: 'Stripe Payments',
    description: 'Process pagamentos e assinaturas',
    icon: '💳',
    category: 'Financeiro',
    isConfigured: false,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Envie mensagens e notificações',
    icon: '💬',
    category: 'Comunicação',
    isConfigured: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Notificações da equipe em tempo real',
    icon: '💼',
    category: 'Comunicação',
    isConfigured: false,
  },
  {
    id: 'healthkit',
    name: 'Apple HealthKit',
    description: 'Importe dados de saúde dos pacientes',
    icon: '❤️',
    category: 'Saúde',
    isConfigured: false,
  },
];

export default function IntegrationsPage() {
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'int-1',
      organization_id: 'org-1',
      provider: 'whatsapp',
      name: 'WhatsApp Oficial',
      is_active: true,
      config: {
        phone_number_id: '123456',
        access_token: '***',
        business_account_id: 'abc123',
        webhook_verify_token: 'token',
      },
      created_by: 'user-1',
      created_at: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
      updated_at: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
      last_sync_at: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
      sync_status: 'synced',
    },
  ]);

  const configuredProviders = new Set(integrations.map((i) => i.provider));

  const handleToggleActive = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_active: !i.is_active } : i))
    );
  };

  const handleSync = async (id: string) => {
    // TODO: Implementar sync
    console.log('Syncing integration:', id);
  };

  const handleConfigure = (provider: IntegrationProvider) => {
    setSelectedProvider(provider);
  };

  const handleDisconnect = (id: string) => {
    if (window.confirm('Tem certeza que deseja desconectar esta integração?')) {
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const groupedProviders = mockProviders.reduce((acc, provider) => {
    if (!acc[provider.category]) {
      acc[provider.category] = [];
    }
    acc[provider.category].push(provider);
    return acc;
  }, {} as Record<string, ProviderInfo[]>);

  return (
    <MainLayout>
      <div className="min-h-screen bg-background/50">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Integrações</h1>
                <p className="text-sm text-muted-foreground">
                  Conecte o FisioFlow com seus serviços favoritos
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6">
          {selectedProvider ? (
            <IntegrationConfig
              provider={selectedProvider}
              onClose={() => setSelectedProvider(null)}
              onSave={(config) => {
                console.log('Saving config for', selectedProvider, config);
                setSelectedProvider(null);
              }}
            />
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedProviders).map(([category, providers]) => (
                <div key={category}>
                  <h2 className="text-lg font-semibold mb-4">{category}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {providers.map((provider) => {
                      const integration = integrations.find((i) => i.provider === provider.id);

                      return (
                        <IntegrationCard
                          key={provider.id}
                          provider={provider}
                          integration={integration}
                          onToggleActive={
                            integration ? () => handleToggleActive(integration.id) : undefined
                          }
                          onSync={integration ? () => handleSync(integration.id) : undefined}
                          onConfigure={() => handleConfigure(provider.id)}
                          onDisconnect={
                            integration ? () => handleDisconnect(integration.id) : undefined
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
