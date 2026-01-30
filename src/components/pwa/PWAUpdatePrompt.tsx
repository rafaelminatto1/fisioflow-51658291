import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { logger } from '@/lib/errors/logger';

export function PWAUpdatePrompt() {
  const [showReload, setShowReload] = useState(false);
  
  const {
    needRefresh: [needRefresh, ],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      logger.info('Service Worker registrado', { swUrl }, 'PWAUpdatePrompt');

      // Verificar atualizações a cada 1 hora
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      logger.error('Erro ao registrar SW', error, 'PWAUpdatePrompt');
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowReload(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
    setShowReload(false);
  };

  if (!showReload) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
      <Card className="shadow-lg border-2 border-primary/20 bg-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Atualização Disponível
          </CardTitle>
          <CardDescription>
            Uma nova versão do FisioFlow está disponível
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2 pt-0">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setShowReload(false)}
          >
            Depois
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={handleUpdate}
          >
            Atualizar Agora
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
