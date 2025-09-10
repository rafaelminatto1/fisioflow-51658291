import { useState } from 'react';

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  birthDate: Date;
  gender: 'masculino' | 'feminino' | 'outro';
  mainCondition: string;
  status: 'Inicial' | 'Em Tratamento' | 'Recuperação' | 'Concluído';
  progress: number;
  address?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  created_at: string;
  updated_at: string;
}

export const usePatients = () => {
  const [loading] = useState(false);
  
  const patients: Patient[] = [
    {
      id: '1',
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '(11) 99999-9999',
      birthDate: new Date('1990-01-15'),
      gender: 'masculino',
      mainCondition: 'Dor nas costas',
      status: 'Em Tratamento',
      progress: 75,
      address: 'Rua das Flores, 123',
      emergencyContact: 'Maria Silva - (11) 88888-8888',
      medicalHistory: 'Histórico de lesões na coluna',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    }
  ];

  const addPatient = async (patientData: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => {
    console.log('Adding patient:', patientData);
    return Promise.resolve();
  };

  const updatePatient = async (id: string, patientData: Partial<Patient>) => {
    console.log('Updating patient:', id, patientData);
    return Promise.resolve();
  };

  const getPatient = (id: string) => {
    return patients.find(p => p.id === id);
  };

  return {
    patients,
    loading,
    addPatient,
    updatePatient,
    getPatient
  };
};