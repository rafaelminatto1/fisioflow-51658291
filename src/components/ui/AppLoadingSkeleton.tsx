import { useEffect, useState } from 'react';

interface AppLoadingSkeletonProps {
  message?: string;
}

/**
 * Skeleton de carregamento otimizado para a aplicação
 * Mostra progresso visual e permite retry após timeout
 */
export function AppLoadingSkeleton({ message }: AppLoadingSkeletonProps) {
  const [showRetry, setShowRetry] = useState(false);
  const [jokeIndex, setJokeIndex] = useState(0);

  const jokes = [
    "Alongando a verdade um pouquinho...",
    "Resistência não é fútil, é fisioterapia!",
    "Trabalhando na sua postura digital...",
    "Fortalecendo os pixels para você.",
    "Só mais uma série de 10 segundos...",
    "Gelo ou calor? Carregando enquanto você decide.",
    "Inspirar... Expirar... Carregar...",
    "Mobilizando as articulações do sistema."
  ];

  // Carrossel de piadas
  useEffect(() => {
    const interval = setInterval(() => {
      setJokeIndex(prev => (prev + 1) % jokes.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Mostrar botão de retry após 4 segundos
  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center space-y-6 max-w-sm w-full px-4">
        {/* Logo/Brand placeholder com animação */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>

        {/* Mensagem de status */}
        <div className="text-center space-y-2 h-16 flex flex-col justify-center">
          <p className="text-foreground font-medium transition-all duration-500">
            {message || jokes[jokeIndex]}
          </p>
          <p className="text-sm text-muted-foreground">
            Preparando sua reabilitação digital
          </p>
        </div>

        {/* Barra de progresso simulada */}
        <div className="w-full max-w-xs h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full animate-pulse"
            style={{ 
              width: '60%',
              animation: 'loading-progress 2s ease-in-out infinite'
            }} 
          />
        </div>

        {/* Botão de retry - aparece após timeout */}
        {showRetry && (
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
          >
            Demora? Clique para recarregar
          </button>
        )}
      </div>

      {/* CSS para animação da barra */}
      <style>{`
        @keyframes loading-progress {
          0% { width: 20%; transform: translateX(-100%); }
          50% { width: 60%; transform: translateX(0); }
          100% { width: 20%; transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
