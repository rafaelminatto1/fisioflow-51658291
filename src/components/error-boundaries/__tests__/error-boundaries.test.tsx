/**
 * Error Boundary Tests
 *
 * @description
 * Tests for error boundary components.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import userEvent from '@testing-library/user-event';
import {
  ErrorBoundary,
  ErrorFallback,
  RouteErrorBoundary,
  withErrorBoundary,
} from '../index';

// Create a test component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Create a component with error boundary
const ComponentWithBoundary = ({ shouldThrow }: { shouldThrow?: boolean }) => (
  <ErrorBoundary
    fallback={<div>Error occurred</div>}
    onError={(error) => console.log('Error caught:', error.message)}
  >
    <ThrowError shouldThrow={shouldThrow} />
  </ErrorBoundary>
);

describe('ErrorFallback', () => {
  it('should render error message', () => {
    const error = new Error('Test error');
    const resetError = vi.fn();

    render(<ErrorFallback error={error} resetError={resetError} />);

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });

  it('should render reset button', () => {
    const error = new Error('Test error');
    const resetError = vi.fn();

    render(<ErrorFallback error={error} resetError={resetError} />);

    const button = screen.getByRole('button', { name: /try again/i });
    expect(button).toBeInTheDocument();

    button.click();
    expect(resetError).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorBoundary', () => {
  it('should render children when no error', () => {
    render(<ComponentWithBoundary shouldThrow={false} />);

    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(screen.queryByText('Error occurred')).not.toBeInTheDocument();
  });

  it('should catch error and render fallback', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    try {
      render(<ComponentWithBoundary shouldThrow={true} />);

      expect(screen.queryByText('No error')).not.toBeInTheDocument();
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    } finally {
      console.error = originalError;
    }
  });

  it('should call onError when error is caught', () => {
    const onError = vi.fn();
    const originalError = console.error;
    console.error = vi.fn();

    try {
      render(
        <ErrorBoundary fallback={<div>Error</div>} onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    } finally {
      console.error = originalError;
    }
  });

  it('should reset error boundary after reset', async () => {
    const resetError = vi.fn();
    const originalError = console.error;
    console.error = vi.fn();

    try {
      const { rerender } = render(
        <ErrorBoundary
          fallback={<ErrorFallback error={new Error('Test')} resetError={resetError} />}
        >
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Trigger error
      rerender(
        <ErrorBoundary
          fallback={<ErrorFallback error={new Error('Test')} resetError={resetError} />}
        >
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Reset
      const button = screen.getByRole('button', { name: /try again/i });
      await userEvent.click(button);

      rerender(
        <ErrorBoundary
          fallback={<ErrorFallback error={new Error('Test')} resetError={resetError} />}
        >
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    } finally {
      console.error = originalError;
    }
  });

  it('should render custom fallback component', () => {
    const CustomFallback = () => <div>Custom Error UI</div>;
    const originalError = console.error;
    console.error = vi.fn();

    try {
      render(
        <ErrorBoundary fallback={<CustomFallback />}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    } finally {
      console.error = originalError;
    }
  });

  it('should render custom fallback function', () => {
    const fallbackFn = (error: Error, resetError: () => void) => (
      <div>
        <span>Custom function: {error.message}</span>
        <button onClick={resetError}>Reset</button>
      </div>
    );
    const originalError = console.error;
    console.error = vi.fn();

    try {
      render(
        <ErrorBoundary fallback={fallbackFn}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Custom function: Test error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    } finally {
      console.error = originalError;
    }
  });
});

describe('RouteErrorBoundary', () => {
  it('should render children when no error', () => {
    render(
      <RouteErrorBoundary>
        <div>Route content</div>
      </RouteErrorBoundary>
    );

    expect(screen.getByText('Route content')).toBeInTheDocument();
  });

  it('should catch and render errors for routes', () => {
    const originalError = console.error;
    console.error = vi.fn();

    try {
      render(
        <RouteErrorBoundary routeName="TestRoute">
          <ThrowError shouldThrow={true} />
        </RouteErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    } finally {
      console.error = originalError;
    }
  });
});

describe('withErrorBoundary HOC', () => {
  it('should wrap component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(ThrowError);

    const originalError = console.error;
    console.error = vi.fn();

    try {
      render(<WrappedComponent shouldThrow={true} />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    } finally {
      console.error = originalError;
    }
  });

  it('should pass props to wrapped component', () => {
    const WrappedComponent = withErrorBoundary(ThrowError);

    render(<WrappedComponent shouldThrow={false} />);

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should use custom options', () => {
    const CustomFallback = () => <div>Custom Error</div>;

    const WrappedComponent = withErrorBoundary(ThrowError, {
      fallback: <CustomFallback />,
    });

    const originalError = console.error;
    console.error = vi.fn();

    try {
      render(<WrappedComponent shouldThrow={true} />);

      expect(screen.getByText('Custom Error')).toBeInTheDocument();
    } finally {
      console.error = originalError;
    }
  });
});

describe('ErrorBoundary integration', () => {
  it('should handle async errors', async () => {
    const AsyncComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(false);

      React.useEffect(() => {
        if (shouldThrow) {
          throw new Error('Async error');
        }
      }, [shouldThrow]);

      return (
        <button onClick={() => setShouldThrow(true)}>Trigger Async Error</button>
      );
    };

    const originalError = console.error;
    console.error = vi.fn();

    try {
      render(
        <ErrorBoundary fallback={<div>Error</div>}>
          <AsyncComponent />
        </ErrorBoundary>
      );

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(screen.getByText('Error')).toBeInTheDocument();
    } finally {
      console.error = originalError;
    }
  });

  it('should handle errors in nested components', () => {
    const NestedComponent = ({ depth = 0 }: { depth?: number }) => {
      if (depth >= 3) {
        throw new Error('Nested error');
      }
      return <NestedComponent depth={depth + 1} />;
    };

    const originalError = console.error;
    console.error = vi.fn();

    try {
      render(
        <ErrorBoundary fallback={<div>Error</div>}>
          <NestedComponent depth={0} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
    } finally {
      console.error = originalError;
    }
  });
});
