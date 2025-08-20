import React, { createContext, useContext, useEffect, useState } from 'react';
import { Patient, Appointment, Exercise } from '@/types';

interface DataContextType {
  // Patients
  patients: Patient[];
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePatient: (id: string, patient: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  getPatient: (id: string) => Patient | undefined;

  // Appointments
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAppointment: (id: string, appointment: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  getAppointment: (id: string) => Appointment | undefined;

  // Exercises
  exercises: Exercise[];
  addExercise: (exercise: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateExercise: (id: string, exercise: Partial<Exercise>) => void;
  deleteExercise: (id: string) => void;
  getExercise: (id: string) => Exercise | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper function to generate IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Mock initial data
const initialPatients: Patient[] = [
  {
    id: '1',
    name: 'Maria Silva',
    email: 'maria.silva@email.com',
    phone: '(11) 99999-9999',
    birthDate: new Date('1978-03-15'),
    gender: 'feminino',
    address: 'Rua das Flores, 123 - Centro, São Paulo - SP',
    emergencyContact: '(11) 88888-8888',
    mainCondition: 'Lombalgia',
    medicalHistory: 'Histórico de dores lombares recorrentes há 2 anos',
    status: 'Em Tratamento',
    progress: 85,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '2',
    name: 'João Santos',
    email: 'joao.santos@email.com',
    phone: '(11) 88888-8888',
    birthDate: new Date('1992-07-20'),
    gender: 'masculino',
    address: 'Av. Principal, 456 - Jardim, São Paulo - SP',
    emergencyContact: '(11) 77777-7777',
    mainCondition: 'Tendinite',
    status: 'Recuperação',
    progress: 60,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-09'),
  },
];

const initialAppointments: Appointment[] = [
  {
    id: '1',
    patientId: '1',
    patientName: 'Maria Silva',
    date: new Date(),
    time: '08:00',
    duration: 60,
    type: 'Fisioterapia',
    status: 'Confirmado',
    phone: '(11) 99999-9999',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    patientId: '2',
    patientName: 'João Santos',
    date: new Date(),
    time: '09:30',
    duration: 45,
    type: 'Reavaliação',
    status: 'Confirmado',
    phone: '(11) 88888-8888',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const initialExercises: Exercise[] = [
  {
    id: '1',
    name: 'Agachamento Livre',
    category: 'fortalecimento',
    difficulty: 'intermediario',
    duration: '3x15 repetições',
    description: 'Exercício para fortalecimento de membros inferiores',
    instructions: 'Pés afastados na largura dos ombros. Desça como se fosse sentar numa cadeira. Mantenha o tronco ereto.',
    targetMuscles: ['Quadríceps', 'Glúteos'],
    equipment: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedPatients = localStorage.getItem('fisioflow-patients');
    const savedAppointments = localStorage.getItem('fisioflow-appointments');
    const savedExercises = localStorage.getItem('fisioflow-exercises');

    if (savedPatients) {
      setPatients(JSON.parse(savedPatients, (key, value) => {
        if (key === 'birthDate' || key === 'createdAt' || key === 'updatedAt') {
          return new Date(value);
        }
        return value;
      }));
    } else {
      setPatients(initialPatients);
    }

    if (savedAppointments) {
      setAppointments(JSON.parse(savedAppointments, (key, value) => {
        if (key === 'date' || key === 'createdAt' || key === 'updatedAt') {
          return new Date(value);
        }
        return value;
      }));
    } else {
      setAppointments(initialAppointments);
    }

    if (savedExercises) {
      setExercises(JSON.parse(savedExercises, (key, value) => {
        if (key === 'createdAt' || key === 'updatedAt') {
          return new Date(value);
        }
        return value;
      }));
    } else {
      setExercises(initialExercises);
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('fisioflow-patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('fisioflow-appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('fisioflow-exercises', JSON.stringify(exercises));
  }, [exercises]);

  // Patient operations
  const addPatient = (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPatient: Patient = {
      ...patientData,
      id: generateId(),
      status: 'Inicial',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setPatients(prev => [...prev, newPatient]);
  };

  const updatePatient = (id: string, updates: Partial<Patient>) => {
    setPatients(prev => prev.map(patient => 
      patient.id === id 
        ? { ...patient, ...updates, updatedAt: new Date() }
        : patient
    ));
  };

  const deletePatient = (id: string) => {
    setPatients(prev => prev.filter(patient => patient.id !== id));
    // Also remove related appointments
    setAppointments(prev => prev.filter(appointment => appointment.patientId !== id));
  };

  const getPatient = (id: string) => {
    return patients.find(patient => patient.id === id);
  };

  // Appointment operations
  const addAppointment = (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const patient = getPatient(appointmentData.patientId);
    const newAppointment: Appointment = {
      ...appointmentData,
      id: generateId(),
      patientName: patient?.name || 'Paciente não encontrado',
      phone: patient?.phone || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setAppointments(prev => [...prev, newAppointment]);
  };

  const updateAppointment = (id: string, updates: Partial<Appointment>) => {
    setAppointments(prev => prev.map(appointment => 
      appointment.id === id 
        ? { ...appointment, ...updates, updatedAt: new Date() }
        : appointment
    ));
  };

  const deleteAppointment = (id: string) => {
    setAppointments(prev => prev.filter(appointment => appointment.id !== id));
  };

  const getAppointment = (id: string) => {
    return appointments.find(appointment => appointment.id === id);
  };

  // Exercise operations
  const addExercise = (exerciseData: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newExercise: Exercise = {
      ...exerciseData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setExercises(prev => [...prev, newExercise]);
  };

  const updateExercise = (id: string, updates: Partial<Exercise>) => {
    setExercises(prev => prev.map(exercise => 
      exercise.id === id 
        ? { ...exercise, ...updates, updatedAt: new Date() }
        : exercise
    ));
  };

  const deleteExercise = (id: string) => {
    setExercises(prev => prev.filter(exercise => exercise.id !== id));
  };

  const getExercise = (id: string) => {
    return exercises.find(exercise => exercise.id === id);
  };

  const value: DataContextType = {
    patients,
    addPatient,
    updatePatient,
    deletePatient,
    getPatient,
    appointments,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointment,
    exercises,
    addExercise,
    updateExercise,
    deleteExercise,
    getExercise,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}