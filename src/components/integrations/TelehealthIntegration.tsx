/**
 * TelehealthIntegration - Integração com plataformas de telemedicina
 *
 * Features:
 * - Zoom integration
 * - Google Meet integration
 * - Microsoft Teams integration
 * - Jitsi integration
 * - Room creation
 * - Meeting links management
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Video,
  Calendar as CalendarIcon,
  Copy,
  ExternalLink,
  Settings,
  Check,
  X,
  Clock,
  Users,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export type TelehealthProvider = 'zoom' | 'google-meet' | 'teams' | 'jitsi';

export interface MeetingConfig {
  provider: TelehealthProvider;
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  defaultDuration?: number;
  enableWaitingRoom?: boolean;
  enableRecording?: boolean;
  enableChat?: boolean;
}

export interface MeetingRoom {
  id: string;
  provider: TelehealthProvider;
  title: string;
  startUrl: string;
  joinUrl: string;
  password?: string;
  startTime: Date;
  duration: number;
  participants?: number;
}

export const TelehealthIntegration: React.FC = () => {
  const [configs, setConfigs] = useState<MeetingConfig[]>([
    {
      provider: 'zoom',
      enabled: false,
      defaultDuration: 60,
      enableWaitingRoom: true,
      enableRecording: true,
      enableChat: true,
    },
    {
      provider: 'google-meet',
      enabled: false,
      defaultDuration: 60,
      enableWaitingRoom: false,
      enableRecording: true,
      enableChat: true,
    },
    {
      provider: 'teams',
      enabled: false,
      defaultDuration: 60,
      enableWaitingRoom: true,
      enableRecording: true,
      enableChat: true,
    },
    {
      provider: 'jitsi',
      enabled: false,
      defaultDuration: 60,
      enableWaitingRoom: true,
      enableRecording: false,
      enableChat: true,
    },
  ]);

  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);

  const getProviderLabel = (provider: TelehealthProvider): string => {
    const labels: Record<TelehealthProvider, string> = {
      'zoom': 'Zoom',
      'google-meet': 'Google Meet',
      'teams': 'Microsoft Teams',
      'jitsi': 'Jitsi Meet',
    };
    return labels[provider];
  };

  const getProviderIcon = (provider: TelehealthProvider) => {
    const icons: Record<TelehealthProvider, React.ReactNode> = {
      'zoom': (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#2D8CFF" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H5v-2h6v2zm8-6h-2v2h2v-2z"/>
        </svg>
      ),
      'google-meet': (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#00897B" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h1l-2 2v2h-1c-.55 0-1-.45-1-1v-6c0-.55.45-1 1-1h7l2 2v2h1c.55 0 1 .45 1 1v-6z"/>
        </svg>
      ),
      'teams': (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#6264A7" d="M22 12.5c0-2.5-2-4.5-4.5-4.5S13 10 13 12.5V7c0-1.65-1.35-3-3-3H6C4.35 4 3 5.35 3 7v10.5c0 1.65 1.35 3 3 3h2.22l2.78 5.56 2.78-5.56H21c1.65 0 3-1.35 3-3V12.5z"/>
        </svg>
      ),
      'jitsi': (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#2C6F9F" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.5-1.5L12 17V7zm7 0l-2-2v9l2-2-3.5 3.5z"/>
        </svg>
      ),
    };
    return icons[provider];
  };

  // Ativar provider
  const handleActivate = useCallback(async (provider: TelehealthProvider) => {
    const config = configs.find((c) => c.provider === provider);
    if (!config?.apiKey) {
      toast({
        title: 'Chave de API necessária',
        description: `Configure a chave de API para ${getProviderLabel(provider)}.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      // Simular ativação
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setConfigs((prev) =>
        prev.map((c) =>
          c.provider === provider ? { ...c, enabled: true } : c
        )
      );

      toast({
        title: 'Ativado!',
        description: `${getProviderLabel(provider)} foi ativado com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao ativar',
        description: `Não foi possível ativar ${getProviderLabel(provider)}.`,
        variant: 'destructive',
      });
    }
  }, [configs, getProviderLabel]);

  // Criar sala de reunião
  const handleCreateRoom = useCallback(async (provider: TelehealthProvider) => {
    const config = configs.find((c) => c.provider === provider);
    if (!config?.enabled) {
      toast({
        title: 'Provider não ativado',
        description: `Ative ${getProviderLabel(provider)} primeiro.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      // Simular criação de sala
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const newRoom: MeetingRoom = {
        id: `room-${Date.now()}`,
        provider,
        title: `Sala de Consulta - ${new Date().toLocaleString()}`,
        startUrl: `https://${provider}.com/start/${Date.now()}`,
        joinUrl: `https://${provider}.com/join/${Date.now()}`,
        password: Math.random().toString(36).substring(2, 8),
        startTime: new Date(),
        duration: config.defaultDuration || 60,
        participants: 0,
      };

      setRooms((prev) => [...prev, newRoom]);
      setSelectedRoom(newRoom);

      toast({
        title: 'Sala criada!',
        description: 'A sala de reunião foi criada com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao criar sala',
        description: `Não foi possível criar a sala em ${getProviderLabel(provider)}.`,
        variant: 'destructive',
      });
    }
  }, [configs, getProviderLabel]);

  // Copiar link
  const handleCopyLink = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Copiado!',
        description: 'O link foi copiado para o clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o link.',
        variant: 'destructive',
      });
    }
  }, []);

  // Atualizar configuração
  const handleUpdateConfig = useCallback((provider: TelehealthProvider, updates: Partial<MeetingConfig>) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.provider === provider ? { ...c, ...updates } : c
      )
    );
  }, []);

  // Deletar sala
  const handleDeleteRoom = useCallback((roomId: string) => {
    if (!window.confirm('Deseja encerrar esta sala de reunião?')) return;
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    if (selectedRoom?.id === roomId) {
      setSelectedRoom(null);
    }
  }, [selectedRoom]);

  const activeProviders = configs.filter((c) => c.enabled);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Video className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Integração Telemedicina</h2>
      </div>

      {/* Lista de providers */}
      <div className="space-y-3">
        {configs.map((config) => (
          <div
            key={config.provider}
            className={cn(
              'p-4 border rounded-lg transition-all',
              config.enabled ? 'bg-primary/5 border-primary/20' : 'bg-background'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getProviderIcon(config.provider)}
                <div>
                  <h3 className="font-semibold">{getProviderLabel(config.provider)}</h3>
                  {config.enabled && (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Check className="w-3 h-3" />
                      Ativo
                    </span>
                  )}
                </div>
              </div>

              {/* Configurações */}
              <button
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Configurações"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Configurações expandidas */}
            {config.enabled && (
              <div className="mt-4 pt-4 border-t space-y-3">
                {/* Criar sala */}
                <button
                  onClick={() => handleCreateRoom(config.provider)}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  Criar Nova Sala
                </button>

                {/* Opções */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Sala de espera</span>
                    <span className={config.enableWaitingRoom ? 'text-green-600' : 'text-muted-foreground'}>
                      {config.enableWaitingRoom ? 'Ativado' : 'Desativado'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Gravação</span>
                    <span className={config.enableRecording ? 'text-green-600' : 'text-muted-foreground'}>
                      {config.enableRecording ? 'Ativado' : 'Desativado'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Chat</span>
                    <span className={config.enableChat ? 'text-green-600' : 'text-muted-foreground'}>
                      {config.enableChat ? 'Ativado' : 'Desativado'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Chave de API (quando não conectado) */}
            {!config.enabled && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Chave de API</label>
                  <input
                    type="password"
                    value={config.apiKey || ''}
                    onChange={(e) => handleUpdateConfig(config.provider, { apiKey: e.target.value })}
                    placeholder="Insira sua chave de API"
                    className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                  />
                </div>
                <button
                  onClick={() => handleActivate(config.provider)}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Ativar Integração
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lista de salas ativas */}
      {rooms.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Salas Ativas
          </h3>

          <div className="space-y-2">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="p-4 border rounded-lg bg-background hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getProviderIcon(room.provider)}
                      <h4 className="font-semibold">{room.title}</h4>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{room.duration} min</span>
                      </div>
                      {room.participants !== undefined && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{room.participants} participante{room.participants !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyLink(room.joinUrl)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Copiar link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => window.open(room.joinUrl, '_blank')}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Abrir em nova aba"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedRoom(room)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Detalhes"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="p-2 hover:bg-destructive/10 rounded-lg text-destructive transition-colors"
                      title="Encerrar sala"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Links */}
                <div className="mt-3 pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Link de entrada:</span>
                    <div className="flex gap-2">
                      <code className="flex-1 px-2 py-1 bg-muted rounded text-xs truncate max-w-xs">
                        {room.joinUrl}
                      </code>
                      <button
                        onClick={() => handleCopyLink(room.joinUrl)}
                        className="p-1.5 hover:bg-muted/50 rounded transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {room.password && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Senha:</span>
                      <span className="font-mono font-medium">{room.password}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de detalhes da sala */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg bg-background rounded-2xl shadow-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Detalhes da Sala</h2>
              <button
                onClick={() => setSelectedRoom(null)}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center">
                {getProviderIcon(selectedRoom.provider)}
                <h3 className="text-lg font-semibold mt-2">{selectedRoom.title}</h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider:</span>
                  <span>{getProviderLabel(selectedRoom.provider)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duração:</span>
                  <span>{selectedRoom.duration} minutos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Participantes:</span>
                  <span>{selectedRoom.participants ?? 0}</span>
                </div>
                {selectedRoom.password && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Senha:</span>
                    <span className="font-mono">{selectedRoom.password}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => window.open(selectedRoom.joinUrl, '_blank')}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <VideoIcon className="w-4 h-4" />
                  Entrar na Sala
                </button>
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
