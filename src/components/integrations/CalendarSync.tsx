/**
 * CalendarSync - Sincronização bidirecional com calendários externos
 *
 * Features:
 * - Google Calendar sync (bidirectional)
 * - iCloud Calendar sync
 * - Outlook Calendar sync
 * - CalDAV support
 * - Conflict resolution
 * - Sync history
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Settings,
  Clock,
  ArrowRightLeft,
  Link2,
  Unlink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export type CalendarProvider = 'google' | 'icloud' | 'outlook' | 'caldav';

export interface CalendarSyncConfig {
  provider: CalendarProvider;
  connected: boolean;
  lastSync?: Date;
  autoSync: boolean;
  syncInterval: number; // minutes
  bidirectional: boolean;
  syncNotes: boolean;
  conflictResolution: 'remote' | 'local' | 'manual';
}

export interface SyncEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  attendees?: string[];
}

export interface SyncConflict {
  localId: string;
  remoteId: string;
  localEvent: SyncEvent;
  remoteEvent: SyncEvent;
  timestamp: Date;
}

export const CalendarSync: React.FC = () => {
  const [configs, setConfigs] = useState<CalendarSyncConfig[]>([
    {
      provider: 'google',
      connected: false,
      autoSync: true,
      syncInterval: 30,
      bidirectional: true,
      syncNotes: true,
      conflictResolution: 'local',
    },
    {
      provider: 'icloud',
      connected: false,
      autoSync: true,
      syncInterval: 30,
      bidirectional: true,
      syncNotes: true,
      conflictResolution: 'local',
    },
    {
      provider: 'outlook',
      connected: false,
      autoSync: true,
      syncInterval: 30,
      bidirectional: false,
      syncNotes: false,
      conflictResolution: 'remote',
    },
    {
      provider: 'caldav',
      connected: false,
      autoSync: false,
      syncInterval: 60,
      bidirectional: true,
      syncNotes: true,
      conflictResolution: 'manual',
    },
  ]);

  const [syncing, setSyncing] = useState<Set<CalendarProvider>>(new Set());
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  const getProviderLabel = (provider: CalendarProvider): string => {
    const labels: Record<CalendarProvider, string> = {
      google: 'Google Calendar',
      icloud: 'iCloud Calendar',
      outlook: 'Outlook',
      caldav: 'CalDAV',
    };
    return labels[provider];
  };

  const getProviderIcon = (provider: CalendarProvider) => {
    const icons: Record<CalendarProvider, React.ReactNode> = {
      google: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25L12 1a1.5 1.5 0 00-1.5 1.5v3.5c-3.05 0-5.5 2.45-5.5 5.5 0 .3.05.07.61.2.89l10.36 10a1.5 1.5 0 001.41-1.41c.13-.13.2-.45.2-.7V11.5c0-3.05-2.45-5.5-5.5-5.5z" />
        </svg>
      ),
      icloud: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#000" d="M18.71 19.5c-.83 1.24-1.71 2.45-2.45 3.3C15.25 23.66 13.7 24 12 24c-1.7 0-3.25-.34-4.5-1.2a11.04 11.04 0 01-2.26-3.3c-.74-.85-1.62-2.06-2.45-3.3H3c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h3.75c.92 0 1.67-.75 1.67-1.67V21c0-.55.45-1 .45-1 0h-3.75zM6.5 2h11c.83 0 1.5.67 1.5 1.5v3c0 .83-.67 1.5-1.5 1.5h-2v-1h2c.55 0 1-.45 1-1V4.5c0-.55.45-1-.45-1 0h-1.5V2c0-.55-.45-1-.45-1z" />
        </svg>
      ),
      outlook: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#0078D4" d="M21.5 6.5h-19A2.5 2.5 0 010 9v9a2.5 2.5 0 002.5 2.5h19a2.5 2.5 0 002.5-2.5v-9a2.5 2.5 0 00-2.5-2.5zM12 11a2 2 0 110 4 2 2 0 010-4z" />
        </svg>
      ),
      caldav: <Calendar className="w-5 h-5" />,
    };
    return icons[provider];
  };

  // Conectar provider
  const handleConnect = useCallback(async (provider: CalendarProvider) => {
    setSyncing((prev) => new Set(prev).add(provider));

    try {
      // Simular conexão - substituir por implementação real
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setConfigs((prev) =>
        prev.map((c) =>
          c.provider === provider
            ? { ...c, connected: true, lastSync: new Date() }
            : c
        )
      );

      toast({
        title: 'Conectado!',
        description: `${getProviderLabel(provider)} foi conectado com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao conectar',
        description: `Não foi possível conectar ao ${getProviderLabel(provider)}.`,
        variant: 'destructive',
      });
    } finally {
      setSyncing((prev) => {
        const next = new Set(prev);
        next.delete(provider);
        return next;
      });
    }
  }, [getProviderLabel]);

  // Desconectar provider
  const handleDisconnect = useCallback(async (provider: CalendarProvider) => {
    if (!window.confirm(`Deseja desconectar ${getProviderLabel(provider)}?`)) return;

    try {
      // Simular desconexão
      await new Promise((resolve) => setTimeout(resolve, 500));

      setConfigs((prev) =>
        prev.map((c) =>
          c.provider === provider
            ? { ...c, connected: false, lastSync: undefined }
            : c
        )
      );

      toast({
        title: 'Desconectado',
        description: `${getProviderLabel(provider)} foi desconectado.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao desconectar',
        description: `Não foi possível desconectar do ${getProviderLabel(provider)}.`,
        variant: 'destructive',
      });
    }
  }, [getProviderLabel]);

  // Sincronizar agora
  const handleSync = useCallback(async (provider: CalendarProvider) => {
    setSyncing((prev) => new Set(prev).add(provider));

    try {
      // Simular sincronização
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setConfigs((prev) =>
        prev.map((c) =>
          c.provider === provider
            ? { ...c, lastSync: new Date() }
            : c
        )
      );

      toast({
        title: 'Sincronizado!',
        description: `${getProviderLabel(provider)} foi sincronizado.`,
      });
    } catch (error) {
      toast({
        title: 'Erro na sincronização',
        description: `Não foi possível sincronizar ${getProviderLabel(provider)}.`,
        variant: 'destructive',
      });
    } finally {
      setSyncing((prev) => {
        const next = new Set(prev);
        next.delete(provider);
        return next;
      });
    }
  }, [getProviderLabel]);

  // Sincronizar todos
  const handleSyncAll = useCallback(async () => {
    const providers = configs.filter((c) => c.connected).map((c) => c.provider);
    await Promise.all(providers.map((p) => handleSync(p)));
  }, [configs, handleSync]);

  // Atualizar configuração
  const handleUpdateConfig = useCallback((provider: CalendarProvider, updates: Partial<CalendarSyncConfig>) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.provider === provider ? { ...c, ...updates } : c
      )
    );
  }, []);

  // Resolver conflito
  const handleResolveConflict = useCallback((conflict: SyncConflict, keep: 'local' | 'remote') => {
    setConflicts((prev) => prev.filter((c) => c.localId !== conflict.localId));
    toast({
      title: 'Conflito resolvido',
      description: `Versão ${keep === 'local' ? 'local' : 'remota'} mantida.`,
    });
  }, []);

  const connectedProviders = configs.filter((c) => c.connected);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Sincronização de Calendário</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSyncAll}
            disabled={syncing.size > 0 || connectedProviders.length === 0}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing.size > 0 ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Sincronizar Todos
          </button>
        </div>
      </div>

      {/* Alertas de conflito */}
      {conflicts.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                {conflicts.length} conflito{conflicts.length !== 1 ? 's' : ''} encontrado{conflicts.length !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                Há eventos que foram modificados tanto localmente quanto remotamente.
                Selecione qual versão manter.
              </p>
              <div className="space-y-2">
                {conflicts.map((conflict) => (
                  <div key={conflict.localId} className="p-3 bg-white dark:bg-slate-900 rounded border">
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleResolveConflict(conflict, 'local')}
                        className="flex-1 p-2 rounded border hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="font-medium mb-1">Versão Local</div>
                        <div className="text-sm text-muted-foreground">
                          {conflict.localEvent.title} - {conflict.localEvent.start.toLocaleString()}
                        </div>
                      </button>
                      <button
                        onClick={() => handleResolveConflict(conflict, 'remote')}
                        className="flex-1 p-2 rounded border hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="font-medium mb-1">Versão Remota</div>
                        <div className="text-sm text-muted-foreground">
                          {conflict.remoteEvent.title} - {conflict.remoteEvent.start.toLocaleString()}
                        </div>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de providers */}
      <div className="space-y-3">
        {configs.map((config) => (
          <div
            key={config.provider}
            className={cn(
              'p-4 border rounded-lg transition-all',
              config.connected ? 'bg-primary/5 border-primary/20' : 'bg-background'
            )}
          >
            {/* Header do provider */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getProviderIcon(config.provider)}
                <div>
                  <h3 className="font-semibold">{getProviderLabel(config.provider)}</h3>
                  {config.lastSync && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Última sync: {config.lastSync.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status e ações */}
              <div className="flex items-center gap-2">
                {config.connected ? (
                  <>
                    <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                      <Check className="w-4 h-4" />
                      Conectado
                    </span>
                    <button
                      onClick={() => handleSync(config.provider)}
                      disabled={syncing.has(config.provider)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Sincronizar agora"
                    >
                      <RefreshCw className={cn('w-4 h-4', syncing.has(config.provider) && 'animate-spin')} />
                    </button>
                    <button
                      onClick={() => handleDisconnect(config.provider)}
                      className="p-2 hover:bg-destructive/10 rounded-lg text-destructive transition-colors"
                      title="Desconectar"
                    >
                      <Unlink className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnect(config.provider)}
                    disabled={syncing.has(config.provider)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncing.has(config.provider) ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                    Conectar
                  </button>
                )}
              </div>
            </div>

            {/* Configurações do provider (quando conectado) */}
            {config.connected && (
              <div className="mt-4 pt-4 border-t space-y-3">
                {/* Auto sync */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sincronização automática</span>
                  <button
                    onClick={() => handleUpdateConfig(config.provider, { autoSync: !config.autoSync })}
                    className={cn(
                      'w-12 h-6 rounded-full transition-colors relative',
                      config.autoSync ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                      config.autoSync ? 'left-7' : 'left-1'
                    )} />
                  </button>
                </div>

                {/* Bidirectional */}
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4" />
                    Sincronização bidirecional
                  </span>
                  <button
                    onClick={() => handleUpdateConfig(config.provider, { bidirectional: !config.bidirectional })}
                    className={cn(
                      'w-12 h-6 rounded-full transition-colors relative',
                      config.bidirectional ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                      config.bidirectional ? 'left-7' : 'left-1'
                    )} />
                  </button>
                </div>

                {/* Sync interval */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Intervalo de sync</span>
                  <select
                    value={config.syncInterval}
                    onChange={(e) => handleUpdateConfig(config.provider, { syncInterval: parseInt(e.target.value) })}
                    className="px-3 py-1.5 rounded-lg border bg-background text-sm"
                  >
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora</option>
                    <option value={120}>2 horas</option>
                    <option value={360}>6 horas</option>
                  </select>
                </div>

                {/* Conflict resolution */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Resolução de conflitos</span>
                  <select
                    value={config.conflictResolution}
                    onChange={(e) => handleUpdateConfig(config.provider, { conflictResolution: e.target.value as any })}
                    className="px-3 py-1.5 rounded-lg border bg-background text-sm"
                  >
                    <option value="local">Manter versão local</option>
                    <option value="remote">Manter versão remota</option>
                    <option value="manual">Perguntar sempre</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
