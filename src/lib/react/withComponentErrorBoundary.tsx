import { ComponentType } from 'react';
import { ComponentErrorBoundary, ComponentErrorBoundaryProps } from '@/components/error/ComponentErrorBoundary';

/**
 * HOC para envolver um componente com ComponentErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  errorBoundaryProps?: Omit<ComponentErrorBoundaryProps, 'children'>
): ComponentType<P> {
  const WrappedComponent: ComponentType<P> = (props) => (
    <ComponentErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ComponentErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
