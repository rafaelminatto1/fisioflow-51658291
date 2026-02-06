/**
 * IntegrationCard - Card de integração para dashboard
 */

import React from 'react';
import { CheckCircle, Settings, RefreshCw, Plug, Unlink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { Integration, IntegrationProvider } from '@/types/integrations';

interface ProviderInfo {
  id: IntegrationProvider;
  name: string;
  description: string;
  icon: string;
  category: string;
  isConfigured: boolean;
}

interface IntegrationCardProps {
  provider: ProviderInfo;
  integration?: Integration;
  onToggleActive?: () => void;
  onSync?: () => void;
  onConfigure: () => void;
  onDisconnect?: () => void;
}

export function IntegrationCard({
  provider,
  integration,
  onToggleActive,
  onSync,
  onConfigure,
  onDisconnect,
}: IntegrationCardProps) {
  const isConfigured = !!integration;
  const isActive = integration?.is_active ?? false;

  return (
    <Card className={isConfigured ? 'border-primary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{provider.icon}</span>
            <div>
              <CardTitle className="text-base">{provider.name}</CardTitle>
              <Badge variant="outline" className="text-xs mt-1">
                {provider.category}
              </Badge>
            </div>
          </div>

          {isConfigured && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">Conectado</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {provider.description}
        </p>

        {integration && (
          <>
            {/* Sync Status */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <Badge
                variant={
                  integration.sync_status === 'synced'
                    ? 'default'
                    : integration.sync_status === 'error'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {integration.sync_status === 'synced'
                  ? 'Sincronizado'
                  : integration.sync_status === 'pending'
                  ? 'Sincronizando...'
                  : integration.sync_status === 'error'
                  ? 'Erro'
                  : 'Pendente'}
              </Badge>
            </div>

            {integration.last_sync_at && (() => {
              const v = integration.last_sync_at;
              const d = v && typeof (v as { toDate?: () => Date }).toDate === 'function'
                ? (v as { toDate: () => Date }).toDate()
                : v instanceof Date ? v : v ? new Date(v as number) : null;
              return d ? (
                <div className="text-xs text-muted-foreground">
                  Última sync: {d.toLocaleString('pt-BR')}
                </div>
              ) : null;
            })()}

            {/* Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Ativo</span>
              <Switch checked={isActive} onCheckedChange={onToggleActive} />
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {isConfigured ? (
            <>
              {onSync && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSync}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onConfigure}
                className="flex-1"
              >
                <Settings className="w-4 h-4 mr-2" />
                Config
              </Button>
              {onDisconnect && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDisconnect}
                  className="text-destructive"
                >
                  <Unlink className="w-4 h-4" />
                </Button>
              )}
            </>
          ) : (
            <Button onClick={onConfigure} className="w-full" size="sm">
              <Plug className="w-4 h-4 mr-2" />
              Conectar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * IntegrationConfig - Modal de configuração de integração
 */
export function IntegrationConfig({
  provider,
  onClose,
  onSave,
}: {
  provider: IntegrationProvider;
  onClose: () => void;
  onSave: (config: unknown) => void;
}) {
  const [config, setConfig] = React.useState({});
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    onSave(config);
    setIsSaving(false);
  };

  const renderFields = () => {
    switch (provider) {
      case 'google_calendar':
        return (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client ID</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="your-client-id.apps.googleusercontent.com"
                onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Secret</label>
              <input
                type="password"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="GOCSPX-..."
                onChange={(e) => setConfig({ ...config, client_secret: e.target.value })}
              />
            </div>
          </>
        );

      case 'stripe':
        return (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Public Key</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="pk_test_..."
                onChange={(e) => setConfig({ ...config, public_key: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Secret Key</label>
              <input
                type="password"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="sk_test_..."
                onChange={(e) => setConfig({ ...config, secret_key: e.target.value })}
              />
            </div>
          </>
        );

      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            Configuração para {provider} em breve...
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background/50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Configurar Integração</h2>
            <p className="text-muted-foreground">
              Conecte com {provider.replace('_', ' ')}
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            {renderFields()}

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
