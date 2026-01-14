import React, { ReactNode, useState } from 'react';
import { mockPatients, mockAppointments } from '@/lib/mockData';
import { DataContext } from './DataContextDefinition';
import type { Patient, Appointment, Exercise, ExercisePlan, MedicalRecord, TreatmentSession, SOAPRecord } from '@/types/context';

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [appointments, setAppointments] = useState<Appointment[]>(
    Array.isArray(mockAppointments) ? mockAppointments.map(apt => ({
      id: apt.id,
      patientId: apt.patientId || '',
      date: apt.date,
      time: apt.time,
      type: apt.type,
      status: apt.status
    })) : []
  );

  const addPatient = async (patient: Omit<Patient, 'id' | 'progress' | 'createdAt' | 'updatedAt'>): Promise<Patient> => {
    const newPatient: Patient = {
      ...patient,
      id: crypto.randomUUID(),
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setPatients(prev => [...prev, newPatient]);
    return newPatient;
  };

  const updatePatient = async (id: string, patient: Partial<Patient>): Promise<Patient> => {
    const updatedPatients = patients.map(p =>
      p.id === id ? { ...p, ...patient, updatedAt: new Date().toISOString() } : p
    );
    setPatients(updatedPatients);
    const updated = updatedPatients.find(p => p.id === id)!;
    return updated;
  };

  const deletePatient = async (id: string): Promise<void> => {
    setPatients(prev => prev.filter(p => p.id !== id));
  };

  const addAppointment = async (appointment: Omit<Appointment, 'id'>): Promise<Appointment> => {
    const newAppointment: Appointment = {
      ...appointment,
      id: crypto.randomUUID()
    };
    setAppointments(prev => [...prev, newAppointment]);
    return newAppointment;
  };

  const updateAppointment = async (id: string, appointment: Partial<Appointment>): Promise<Appointment> => {
    const updatedAppointments = appointments.map(a =>
      a.id === id ? { ...a, ...appointment } : a
    );
    setAppointments(updatedAppointments);
    const updated = updatedAppointments.find(a => a.id === id)!;
    return updated;
  };

  const deleteAppointment = async (id: string): Promise<void> => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  const addExercise = async (exercise: Omit<Exercise, 'id'>): Promise<Exercise> => {
    return { ...exercise, id: crypto.randomUUID() };
  };

  const addExercisePlan = async (plan: Omit<ExercisePlan, 'id'>): Promise<ExercisePlan> => {
    return { ...plan, id: crypto.randomUUID() };
  };

  const addMedicalRecord = async (record: Omit<MedicalRecord, 'id'>): Promise<MedicalRecord> => {
    return { ...record, id: crypto.randomUUID() };
  };

  const addTreatmentSession = async (session: Omit<TreatmentSession, 'id'>): Promise<TreatmentSession> => {
    return { ...session, id: crypto.randomUUID() };
  };

  const updateTreatmentSession = async (id: string, session: Partial<TreatmentSession>): Promise<void> => {
    // Mock implementation
  };

  const addSOAPRecord = async (record: Omit<SOAPRecord, 'id'>): Promise<SOAPRecord> => {
    return { ...record, id: crypto.randomUUID() };
  };

  const updateSOAPRecord = async (id: string, record: Partial<SOAPRecord>): Promise<void> => {
    // Mock implementation
  };

  const value = {
    patients,
    appointments,
    addPatient,
    updatePatient,
    deletePatient,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    addExercise,
    addExercisePlan,
    addMedicalRecord,
    addTreatmentSession,
    updateTreatmentSession,
    addSOAPRecord,
    updateSOAPRecord
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
