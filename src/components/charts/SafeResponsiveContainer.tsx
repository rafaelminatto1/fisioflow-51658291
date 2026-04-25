import * as React from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

type SafeResponsiveContainerProps = React.ComponentProps<typeof ResponsiveContainer> & {
  className?: string;
  minHeight?: number;
};

export function SafeResponsiveContainer({
  className,
  minHeight = 160,
  children,
  ...props
}: SafeResponsiveContainerProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = React.useState<{
    width: number;
    height: number;
  } | null>(null);

  React.useEffect(() => {
    const element = hostRef.current;
    if (!element) return;

    const updateSize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setDimensions({
          width: Math.floor(width),
          height: Math.floor(height),
        });
        return;
      }

      setDimensions(null);
    };

    const frameId = requestAnimationFrame(updateSize);

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(element);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={hostRef} className={cn("w-full min-w-0", className)} style={{ minHeight }}>
      {dimensions ? (
        <ResponsiveContainer width={dimensions.width} height={dimensions.height} {...props}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
