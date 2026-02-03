/**
 * IntegrationConfig Component
 * Modal/dialog for configuring integrations
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { IntegrationProvider } from '@/types/integrations';

interface IntegrationConfigProps {
  provider: IntegrationProvider;
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => void;
  isOpen?: boolean;
}

const providerNames: Record<IntegrationProvider, string> = {
  google_calendar: 'Google Calendar',
  zoom: 'Zoom Meetings',
  stripe: 'Stripe Payments',
  whatsapp: 'WhatsApp Business API',
  healthkit: 'Apple HealthKit',
  google_fit: 'Google Fit',
  slack: 'Slack Notifications',
  teams: 'Microsoft Teams',
  outlook_calendar: 'Outlook Calendar',
  quickbooks: 'QuickBooks Accounting',
  asana: 'Asana Project Sync',
  trello: 'Trello Sync',
  custom_webhook: 'Webhook Custom'
};

export function IntegrationConfig({ provider, onClose, onSave, isOpen = true }: IntegrationConfigProps) {
  const [config, setConfig] = React.useState<Record<string, unknown>>({});

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar Integração</DialogTitle>
          <DialogDescription>
            Configure as credenciais e opções para {providerNames[provider]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Generic fields that would be customized per provider */}
          <div className="space-y-2">
            <Label htmlFor="client-id">Client ID / API Key</Label>
            <Input
              id="client-id"
              placeholder="Insira a Client ID ou API Key"
              value={config.client_id as string || ''}
              onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-secret">Client Secret / API Secret</Label>
            <Input
              id="client-secret"
              type="password"
              placeholder="Insira a Client Secret ou API Secret"
              value={config.client_secret as string || ''}
              onChange={(e) => setConfig({ ...config, client_secret: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Integração Ativa</Label>
            <Switch
              id="active"
              checked={config.is_active as boolean || false}
              onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sync-direction">Direção de Sincronização</Label>
            <Select
              value={config.sync_direction as string || 'bidirectional'}
              onValueChange={(value) => setConfig({ ...config, sync_direction: value })}
            >
              <SelectTrigger id="sync-direction">
                <SelectValue placeholder="Selecione a direção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bidirectional">Bidirecional</SelectItem>
                <SelectItem value="import_only">Apenas Importar</SelectItem>
                <SelectItem value="export_only">Apenas Exportar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Configuração</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
