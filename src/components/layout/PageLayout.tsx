import React from "react";
import { MainLayout } from "./MainLayout";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  showBreadcrumbs?: boolean;
  showFooter?: boolean;
  compactHeader?: boolean;
  className?: string;
}

export function PageLayout({
  children,
  showBreadcrumbs = true,
  showFooter = true,
  compactHeader = false,
  className,
}: PageLayoutProps) {
  return (
    <MainLayout 
      showBreadcrumbs={showBreadcrumbs}
      compactPadding={compactHeader}
    >
      <div className={cn("flex-1 flex flex-col min-h-0", className)}>
        {children}
        
        {showFooter && (
          <footer className="mt-auto border-t bg-muted/30 py-6 px-4 md:px-8">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
              <p>© {new Date().getFullYear()} FisioFlow. Todos os direitos reservados.</p>
              <div className="flex gap-6">
                <a href="#" className="hover:text-brand-blue transition-colors">Termos</a>
                <a href="#" className="hover:text-brand-blue transition-colors">Privacidade</a>
                <a href="#" className="hover:text-brand-blue transition-colors">Suporte</a>
              </div>
            </div>
          </footer>
        )}
      </div>
    </MainLayout>
  );
}

export { PageContainer } from "./PageContainer";
export { PageHeader } from "./PageHeader";
