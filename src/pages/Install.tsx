import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Smartphone, 
  Wifi, 
  Zap, 
  Shield,
  Check,
  Share2,
  MoreVertical
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capturar evento de instalação
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  const features = [
    {
      icon: Wifi,
      title: 'Funciona Offline',
      description: 'Acesse seus dados mesmo sem conexão com a internet'
    },
    {
      icon: Zap,
      title: 'Carregamento Rápido',
      description: 'App otimizado para abrir instantaneamente'
    },
    {
      icon: Shield,
      title: 'Seguro e Confiável',
      description: 'Seus dados protegidos com criptografia de ponta'
    },
    {
      icon: Smartphone,
      title: 'Acesso Direto',
      description: 'Ícone na tela inicial como um app nativo'
    }
  ];

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge className="mx-auto">Progressive Web App</Badge>
          <h1 className="text-4xl font-bold">Instale o FisioFlow</h1>
          <p className="text-xl text-muted-foreground">
            Tenha acesso rápido e trabalhe offline
          </p>
        </div>

        {/* Status Card */}
        {isInstalled ? (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    App Instalado!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Você já pode acessar o FisioFlow pela tela inicial
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Como Instalar</CardTitle>
              <CardDescription>
                Siga os passos abaixo para instalar o app no seu dispositivo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deferredPrompt && !isIOS ? (
                <Button 
                  onClick={handleInstall}
                  size="lg"
                  className="w-full"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Instalar Agora
                </Button>
              ) : isIOS ? (
                <div className="space-y-4 p-4 border rounded-lg">
                  <p className="font-medium">Para instalar no iPhone/iPad:</p>
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        1
                      </span>
                      <span>
                        Toque no botão <Share2 className="inline h-4 w-4 mx-1" /> (compartilhar) 
                        na barra inferior do Safari
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        2
                      </span>
                      <span>
                        Role para baixo e toque em "Adicionar à Tela de Início"
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        3
                      </span>
                      <span>
                        Confirme tocando em "Adicionar"
                      </span>
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-4 p-4 border rounded-lg">
                  <p className="font-medium">Para instalar no Android:</p>
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        1
                      </span>
                      <span>
                        Toque no menu <MoreVertical className="inline h-4 w-4 mx-1" /> no navegador
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        2
                      </span>
                      <span>
                        Selecione "Adicionar à tela inicial" ou "Instalar app"
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        3
                      </span>
                      <span>
                        Confirme a instalação
                      </span>
                    </li>
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Por que instalar?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Experiência Nativa</p>
                <p className="text-sm text-muted-foreground">
                  O app se comporta como um aplicativo nativo, sem bordas do navegador
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Menor Consumo de Dados</p>
                <p className="text-sm text-muted-foreground">
                  Cache inteligente reduz o uso de internet móvel
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Atualizações Automáticas</p>
                <p className="text-sm text-muted-foreground">
                  Sempre tenha a versão mais recente sem precisar atualizar manualmente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
