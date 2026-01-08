import React, { ReactNode, useState, useEffect } from 'react';
import { mockPatients, mockAppointments } from '@/lib/mockData';
import { DataContext } from './DataContextDefinition';
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
    <DataContext.Provider value={value as any}> {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
      {children}
    </DataContext.Provider>
  );
};
