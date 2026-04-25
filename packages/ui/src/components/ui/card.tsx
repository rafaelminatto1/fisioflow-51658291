import * as React from "react";
import { cn } from "../../lib/utils";

type CardVariant =
  | "default"
  | "brand"
  | "success"
  | "warm"
  | "dark"
  | "neon"
  | "glass"
  | "accent-teal";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  premiumHover?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", premiumHover = false, ...props }, ref) => {
    const variantClasses: Record<CardVariant, string> = {
      default: "bg-card text-card-foreground border border-border/40 shadow-sm",
      brand: "gradient-brand text-primary-foreground border-none shadow-premium-sm",
      success: "gradient-success text-white border-none shadow-premium-sm",
      warm: "gradient-warm text-white border-none shadow-premium-sm",
      dark: "gradient-dark text-white border-none shadow-premium-sm",
      neon: "gradient-neon text-white border-none shadow-premium-md",
      glass: "gradient-glass backdrop-blur-xl border border-white/20 shadow-premium-md",
      "accent-teal": "gradient-accent-teal text-white border-none shadow-premium-sm",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl transition-all duration-500",
          premiumHover && "card-premium-hover",
          variantClasses[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-2xl font-black leading-none tracking-tight font-display", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
