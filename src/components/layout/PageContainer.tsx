import type React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full";
  className?: string;
  noPadding?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = "7xl",
  className,
  noPadding = false,
}) => {
  return (
    <div
      className={cn(
        "mx-auto w-full transition-all duration-500 animate-slide-up",
        !noPadding && "p-4 md:p-8 pt-0 md:pt-0",
        maxWidth === "sm" && "max-w-sm",
        maxWidth === "md" && "max-w-md",
        maxWidth === "lg" && "max-w-lg",
        maxWidth === "xl" && "max-w-xl",
        maxWidth === "2xl" && "max-w-2xl",
        maxWidth === "7xl" && "max-w-7xl",
        maxWidth === "full" && "max-w-full",
        className
      )}
    >
      {children}
    </div>
  );
};
