/**
 * RouteErrorBoundary — Error Boundary para nível de rota.
 * Inclui contexto da URL para melhor rastreabilidade de erros.
 */

import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ComponentErrorBoundary } from "./ComponentErrorBoundary";
import { fisioLogger as logger } from "@/lib/errors/logger";

interface RouteErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  routeName?: string;
}

export function RouteErrorBoundary({
  children,
  fallback,
  routeName,
}: RouteErrorBoundaryProps): ReactNode {
  const location = useLocation();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    logger.error(`Route Error: ${routeName || location.pathname}`, error, "RouteErrorBoundary", {
      componentStack: errorInfo.componentStack,
      path: location.pathname,
      search: location.search,
      routeName: routeName || location.pathname,
    });
  };

  return (
    <ComponentErrorBoundary
      fallback={fallback}
      onError={handleError}
      componentName={routeName || location.pathname}
    >
      {children}
    </ComponentErrorBoundary>
  );
}

export default RouteErrorBoundary;
