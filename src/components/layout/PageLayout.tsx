import React from "react";
import { MainLayout } from "./MainLayout";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  showBreadcrumbs?: boolean;
  showFooter?: boolean;
  compactHeader?: boolean;
  fullWidth?: boolean;
  noPadding?: boolean;
  hideDefaultHeader?: boolean;
  customHeader?: React.ReactNode;
  className?: string;
}

export function PageLayout({
  children,
  showBreadcrumbs = true,
  showFooter: _showFooter = true,
  compactHeader = false,
  fullWidth = false,
  noPadding = false,
  hideDefaultHeader = false,
  customHeader,
  className,
}: PageLayoutProps) {
  return (
    <MainLayout
      showBreadcrumbs={showBreadcrumbs}
      compactPadding={compactHeader}
      fullWidth={fullWidth}
      noPadding={noPadding}
      hideDefaultHeader={hideDefaultHeader}
      customHeader={customHeader}
    >
      <div className={cn("flex-1 flex flex-col min-h-0", className)}>
        {children}
      </div>
    </MainLayout>
  );
}

export { PageContainer } from "./PageContainer";
export { PageHeader } from "./PageHeader";
