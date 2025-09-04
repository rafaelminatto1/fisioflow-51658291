import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, useErrorBoundary, withErrorBoundary } from '@/components/error/ErrorBoundary';
import React from 'react';

// Mock do errorLogger
vi.mock('@/lib/errors/logger', () => ({
  errorLogger: {
    logError: vi.fn(),
    logWarning: vi.fn(),
    logInfo: vi.fn()
  }
}));

// Mock do react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

// Componente que gera erro para testes
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Componente que usa o hook useErrorBoundary
const ComponentWithErrorBoundary = () => {
  const { captureError } = useErrorBoundary();
  
  const handleClick = () => {
    captureError(new Error('Manual error'));
  };
  
  return (
    <div>
      <span>Component content</span>
      <button onClick={handleClick}>Trigger Error</button>
    </div>
  );
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suprimir console.error durante os testes
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  describe('ErrorBoundary Component', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
    
    it('should render error fallback when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();
      expect(screen.getByText(/Ocorreu um erro inesperado/)).toBeInTheDocument();
    });
    
    it('should display error message in development mode', () => {
      // Simular modo de desenvolvimento
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Custom error message" />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      
      // Restaurar NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });
    
    it('should show retry button and handle retry', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const retryButton = screen.getByText('Tentar Novamente');
      expect(retryButton).toBeInTheDocument();
      
      // Simular que o erro foi corrigido
      fireEvent.click(retryButton);
      
      // Re-renderizar sem erro
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
    
    it('should show home button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const homeButton = screen.getByText('Ir para Início');
      expect(homeButton).toBeInTheDocument();
    });
    
    it('should show reload button and handle reload', () => {
      // Mock window.location.reload
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      });
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const reloadButton = screen.getByText('Recarregar Página');
      fireEvent.click(reloadButton);
      
      expect(mockReload).toHaveBeenCalled();
    });
    
    it('should render custom fallback component', () => {
      const CustomFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
        <div>
          <h1>Custom Error</h1>
          <p>{error.message}</p>
          <button onClick={retry}>Custom Retry</button>
        </div>
      );
      
      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError shouldThrow={true} errorMessage="Custom error" />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Custom Error')).toBeInTheDocument();
      expect(screen.getByText('Custom error')).toBeInTheDocument();
      expect(screen.getByText('Custom Retry')).toBeInTheDocument();
    });
    
    it('should call onError callback when error occurs', () => {
      const onErrorCallback = vi.fn();
      
      render(
        <ErrorBoundary onError={onErrorCallback}>
          <ThrowError shouldThrow={true} errorMessage="Callback test" />
        </ErrorBoundary>
      );
      
      expect(onErrorCallback).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
    });
  });
  
  describe('useErrorBoundary Hook', () => {
    it('should provide captureError function', () => {
      render(
        <ErrorBoundary>
          <ComponentWithErrorBoundary />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Component content')).toBeInTheDocument();
      expect(screen.getByText('Trigger Error')).toBeInTheDocument();
    });
    
    it('should trigger error boundary when captureError is called', () => {
      render(
        <ErrorBoundary>
          <ComponentWithErrorBoundary />
        </ErrorBoundary>
      );
      
      const triggerButton = screen.getByText('Trigger Error');
      fireEvent.click(triggerButton);
      
      expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();
    });
  });
  
  describe('withErrorBoundary HOC', () => {
    it('should wrap component with error boundary', () => {
      const TestComponent = () => <div>HOC Test</div>;
      const WrappedComponent = withErrorBoundary(TestComponent);
      
      render(<WrappedComponent />);
      
      expect(screen.getByText('HOC Test')).toBeInTheDocument();
    });
    
    it('should catch errors in wrapped component', () => {
      const ErrorComponent = () => {
        throw new Error('HOC Error');
      };
      const WrappedComponent = withErrorBoundary(ErrorComponent);
      
      render(<WrappedComponent />);
      
      expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();
    });
    
    it('should pass props to wrapped component', () => {
      const TestComponent = ({ message }: { message: string }) => (
        <div>{message}</div>
      );
      const WrappedComponent = withErrorBoundary(TestComponent);
      
      render(<WrappedComponent message="HOC Props Test" />);
      
      expect(screen.getByText('HOC Props Test')).toBeInTheDocument();
    });
    
    it('should use custom options in HOC', () => {
      const CustomFallback = () => <div>Custom HOC Fallback</div>;
      const onError = vi.fn();
      
      const TestComponent = () => {
        throw new Error('HOC Custom Error');
      };
      
      const WrappedComponent = withErrorBoundary(TestComponent, {
        fallback: CustomFallback,
        onError
      });
      
      render(<WrappedComponent />);
      
      expect(screen.getByText('Custom HOC Fallback')).toBeInTheDocument();
      expect(onError).toHaveBeenCalled();
    });
  });
  
  describe('Error Boundary State Management', () => {
    it('should reset error state when retry is called', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Verificar se o erro está sendo exibido
      expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();
      
      // Clicar em retry
      const retryButton = screen.getByText('Tentar Novamente');
      fireEvent.click(retryButton);
      
      // Re-renderizar sem erro
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      
      // Verificar se o conteúdo normal está sendo exibido
      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText('Ops! Algo deu errado')).not.toBeInTheDocument();
    });
    
    it('should maintain error state until retry', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();
      
      // Re-renderizar com props diferentes mas ainda com erro
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Different error" />
        </ErrorBoundary>
      );
      
      // Deve ainda mostrar o erro original
      expect(screen.getByText('Ops! Algo deu errado')).toBeInTheDocument();
    });
  });
  
  describe('Error Logging Integration', () => {
    it('should log errors when they occur', async () => {
      const { errorLogger } = await import('@/lib/errors/logger');
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Logging test" />
        </ErrorBoundary>
      );
      
      expect(errorLogger.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          component: 'ErrorBoundary',
          errorInfo: expect.any(Object)
        })
      );
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toBeInTheDocument();
      expect(errorContainer).toHaveAttribute('aria-live', 'assertive');
    });
    
    it('should have accessible buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const retryButton = screen.getByRole('button', { name: /tentar novamente/i });
      const homeButton = screen.getByRole('button', { name: /ir para início/i });
      const reloadButton = screen.getByRole('button', { name: /recarregar página/i });
      
      expect(retryButton).toBeInTheDocument();
      expect(homeButton).toBeInTheDocument();
      expect(reloadButton).toBeInTheDocument();
    });
  });
});