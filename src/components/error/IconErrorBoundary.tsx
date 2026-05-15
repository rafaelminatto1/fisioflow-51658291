import { Component, ReactNode } from "react";
import { CircleSlash } from "lucide-react";
import { fisioLogger as logger } from "@/lib/errors/logger";

interface IconErrorBoundaryProps {
  children: ReactNode;
  iconName?: string;
  className?: string;
  fallback?: ReactNode;
}

interface IconErrorBoundaryState {
  hasError: boolean;
}

export class IconErrorBoundary extends Component<IconErrorBoundaryProps, IconErrorBoundaryState> {
  constructor(props: IconErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): IconErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { iconName } = this.props;
    logger.warn(
      `Icon failed to render${iconName ? `: ${iconName}` : ""}`,
      { error: error.message, componentStack: errorInfo.componentStack },
      "IconErrorBoundary",
    );
  }

  render(): ReactNode {
    const { children, className, fallback } = this.props;
    const { hasError } = this.state;

    if (hasError) {
      if (fallback) return fallback;
      // Generic subtle fallback for broken icons
      return <CircleSlash className={`text-muted-foreground/50 ${className || "h-4 w-4"}`} />;
    }

    return children;
  }
}

/**
 * HOC to easily wrap dynamic icons
 */
export function withIconErrorBoundary<P extends object>(
  WrappedIcon: React.ComponentType<P>,
  fallbackProps?: Partial<P>,
) {
  return function SafeIcon(props: P) {
    return (
      <IconErrorBoundary>
        <WrappedIcon {...props} />
      </IconErrorBoundary>
    );
  };
}
