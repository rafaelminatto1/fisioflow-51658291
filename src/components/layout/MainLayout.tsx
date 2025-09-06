import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
// import { AIAssistant } from '@/components/ai/AIAssistant';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-background to-muted/20">
          {children}
        </main>
      </div>
      {/* <AIAssistant /> */}
    </div>
  );
}