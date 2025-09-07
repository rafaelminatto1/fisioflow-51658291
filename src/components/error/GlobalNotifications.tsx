import React from 'react';

// Componente provider para notificações globais
interface GlobalNotificationsProviderProps {
  children: React.ReactNode;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  maxNotifications?: number;
}

export const GlobalNotificationsProvider: React.FC<GlobalNotificationsProviderProps> = ({
  children
}) => {
  return (
    <>
      {children}
      {/* O Sonner já está configurado no App.tsx, então não precisamos adicionar novamente */}
    </>
  );
};

export default GlobalNotificationsProvider;