 
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary leve para componentes pequenos
 * Use para cards, widgets e outras partes isoladas da UI
 */
 
/**
 * Fallback compacto para erros em componentes pequenos
 */
export function SmallErrorFallback({ error }: { error?: Error }) {
  return (
    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
      <div className="flex items-center gap-2 text-sm text-destructive">
        <svg
          className="h-4 w-4 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Erro ao carregar componente</span>
      </div>
      {import.meta.env.DEV && error?.message && (
        <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
      )}
    </div>
  );
}

/**
 * Componente que envolve outros componentes com Error Boundary
 */
export function SmallErrorBoundary({ children, fallback }: Props) {
  return (
    <ErrorBoundaryClass fallback={fallback}>{children}</ErrorBoundaryClass>
  );
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <SmallErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
