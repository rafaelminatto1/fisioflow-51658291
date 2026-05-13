import * as React from "react";
import { cn } from "@/lib/utils";

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
      default: "bg-card text-card-foreground border border-border ",
      brand: "gradient-brand text-primary-foreground border-none ",
      success: "gradient-success text-white border-none ",
      warm: "gradient-warm text-white border-none ",
      dark: "gradient-dark text-white border-none ",
      neon: "gradient-neon text-white border-none ",
      glass: "gradient-glass backdrop-blur-xl border border-white/20 ",
      "accent-teal": "gradient-accent-teal text-white border-none ",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[16px] transition-all duration-500",
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

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { as?: "h1" | "h2" | "h3" | "h4" | "p" }
>(({ className, as: Tag = "h3", ...props }, ref) => (
  <Tag
    ref={ref as React.Ref<HTMLHeadingElement>}
    className={cn("text-2xl font-black leading-none tracking-tight font-display", className)}
    {...props}
  />
));
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
