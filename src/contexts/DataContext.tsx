// Simplified data context
import React, { createContext, useContext, ReactNode } from 'react';

interface DataContextType {
  patients: any[];
  appointments: any[];
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const value = {
    patients: [
      { id: '1', name: 'João Silva', email: 'joao@email.com' },
      { id: '2', name: 'Maria Santos', email: 'maria@email.com' }
    ],
    appointments: [
      { id: '1', patient_name: 'João Silva', time: '09:00', type: 'Fisioterapia' },
      { id: '2', patient_name: 'Maria Santos', time: '10:00', type: 'Consulta' }
    ],
    isLoading: false
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};