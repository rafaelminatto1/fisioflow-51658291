import React from 'react';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4">
        {children}
      </div>
    </main>
  );
};

export default MainLayout;
