import { useEffect, useState } from 'react';
import type { VideoIntegrationConfig, VideoProvider } from '@/lib/telemedicine/types';

export function useVideoIntegration(config?: VideoIntegrationConfig) {
  const [provider, setProvider] = useState<VideoProvider>(config?.provider || 'builtin');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se a API do provedor está disponível
    if (provider === 'whereby') {
      const wherebyEmbed = (window as Window & { WherebyEmbed?: { new: (element: HTMLElement, config: Record<string, unknown>) => { on: (event: string, callback: () => void) => void } } }).WherebyEmbed;
      if (!wherebyEmbed && !config?.roomUrl) {
        setError('Whereby não está configurado');
        return;
      }
      setIsReady(true);
    } else if (provider === 'twilio') {
      const Twilio = (window as Window & { Twilio?: unknown }).Twilio;
      if (!Twilio && !config?.apiKey) {
        setError('Twilio não está configurado');
        return;
      }
      setIsReady(true);
    } else {
      setIsReady(true);
    }
  }, [provider, config]);

  return {
    provider,
    setProvider,
    isReady,
    error,
    canRecord: provider !== 'builtin',
    supportsChat: provider !== 'builtin',
    supportsScreenShare: provider !== 'builtin',
  };
}
