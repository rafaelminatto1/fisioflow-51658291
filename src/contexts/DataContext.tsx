// Simplified data context with mock data
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { mockPatients, mockAppointments } from '@/lib/mockData';

interface DataContextType {
  patients: any[];
  appointments: any[];
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simular carregamento inicial
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const value = {
    patients: mockPatients,
    appointments: mockAppointments.map(apt => ({
      id: apt.id,
      patient_name: apt.patientName,
      time: apt.time,
      type: apt.type,
      date: apt.date,
      status: apt.status
    })),
    isLoading
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