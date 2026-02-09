/**
 * Data Export Module (LGPD Compliance)
 *
 * Módulo para exportação de dados do paciente em conformidade com a LGPD.
 * Permite que o paciente baixe todos os seus dados em formato JSON estruturado.
 *
 * @module lib/dataExport
 */

import { firestore } from 'firebase/app';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

/**
 * Estrutura completa dos dados do paciente para exportação
 */
export interface PatientDataExport {
  metadata: {
    exportedAt: string;
    exportedBy: string;
    version: string;
    format: 'FisioFlow-Patient-Export-v1';
  };
  patient: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
    birthDate?: string;
    address?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    createdAt: string;
    lastLoginAt?: string;
  };
  exercises: {
    plans: ExercisePlanExport[];
    patientExercises: PatientExerciseExport[];
    completions: ExerciseCompletionExport[];
  };
  appointments: AppointmentExport[];
  evolutions: EvolutionExport[];
  communications: {
    sent: MessageExport[];
    received: MessageExport[];
  };
  healthData: {
    wellness?: any;
    integrations?: {
      healthkit?: any;
      googleFit?: any;
    };
  };
}

export interface ExercisePlanExport {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  exercises: any[];
}

export interface PatientExerciseExport {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  prescribedAt: string;
  completedAt?: string;
  feedback?: {
    difficulty: number;
    pain: number;
  };
}

export interface ExerciseCompletionExport {
  exerciseId: string;
  exerciseName: string;
  completedAt: string;
  feedback?: {
    difficulty: number;
    pain: number;
  };
}

export interface AppointmentExport {
  id: string;
  type: string;
  professionalName: string;
  professionalId?: string;
  date: string;
  time: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface EvolutionExport {
  id: string;
  sessionNumber: number;
  date: string;
  professionalName: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  painLevel: number;
}

export interface MessageExport {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  read: boolean;
}

/**
 * Opções para exportação de dados
 */
export interface DataExportOptions {
  includeEvolutions?: boolean;
  includeMessages?: boolean;
  includeHealthData?: boolean;
  compress?: boolean;
}

/**
 * Classe principal para exportação de dados
 */
export class DataExporter {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Exporta todos os dados do paciente
   */
  async exportAll(options: DataExportOptions = {}): Promise<PatientDataExport> {
    const {
      includeEvolutions = true,
      includeMessages = true,
      includeHealthData = true,
    } = options;

    try {
      // Buscar dados básicos do paciente
      const patient = await this.getPatientData();

      // Buscar exercícios
      const exercises = await this.getExercisesData();

      // Buscar consultas
      const appointments = await this.getAppointmentsData();

      // Buscar evoluções
      const evolutions = includeEvolutions ? await this.getEvolutionsData() : [];

      // Buscar mensagens
      const communications = includeMessages ? await this.getMessagesData() : {
        sent: [],
        received: [],
      };

      // Buscar dados de saúde
      const healthData = includeHealthData ? await this.getHealthData() : {};

      const exportData: PatientDataExport = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: this.userId,
          version: '1.0.0',
          format: 'FisioFlow-Patient-Export-v1',
        },
        patient,
        exercises,
        appointments,
        evolutions,
        communications,
        healthData,
      };

      return exportData;
    } catch (error) {
      console.error('Error exporting patient data:', error);
      throw new Error('Falha ao exportar dados: ' + (error as Error).message);
    }
  }

  /**
   * Busca dados básicos do paciente
   */
  private async getPatientData(): Promise<PatientDataExport['patient']> {
    const userDoc = await getDoc(doc(db, 'users', this.userId));

    if (!userDoc.exists()) {
      throw new Error('Dados do usuário não encontrados');
    }

    const data = userDoc.data();
    return {
      id: this.userId,
      name: data.name || '',
      email: data.email || '',
      phone: data.phone,
      cpf: data.cpf,
      birthDate: data.birthDate,
      address: data.address,
      createdAt: data.createdAt || new Date().toISOString(),
      lastLoginAt: data.lastLoginAt,
    };
  }

  /**
   * Busca dados de exercícios
   */
  private async getExercisesData(): Promise<PatientDataExport['exercises']> {
    // Buscar planos de exercícios
    const plansRef = collection(db, 'users', this.userId, 'exercise_plans');
    const plansSnapshot = await getDocs(plansRef);

    const plans: ExercisePlanExport[] = [];
    const patientExercises: PatientExerciseExport[] = [];
    const completions: ExerciseCompletionExport[] = [];

    plansSnapshot.forEach((doc) => {
      const data = doc.data();
      plans.push({
        id: doc.id,
        name: data.name || '',
        description: data.description,
        createdAt: data.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toISOString() || new Date().toISOString(),
        exercises: data.exercises || [],
      });

      // Extrair exercícios do paciente
      if (data.exercises && Array.isArray(data.exercises)) {
        data.exercises.forEach((ex: any) => {
          patientExercises.push({
            id: ex.id || '',
            exerciseId: ex.exerciseId || '',
            exerciseName: ex.name || '',
            sets: ex.sets || 0,
            reps: ex.reps || 0,
            prescribedAt: data.createdAt?.toISOString() || new Date().toISOString(),
            completedAt: ex.completedAt?.toISOString(),
            feedback: ex.feedback,
          });

          if (ex.completed) {
            completions.push({
              exerciseId: ex.id || '',
              exerciseName: ex.name || '',
              completedAt: ex.completedAt?.toISOString() || new Date().toISOString(),
              feedback: ex.feedback,
            });
          }
        });
      }
    });

    return { plans, patientExercises, completions };
  }

  /**
   * Busca dados de consultas
   */
  private async getAppointmentsData(): Promise<AppointmentExport[]> {
    const appointmentsRef = collection(db, 'users', this.userId, 'appointments');
    const appointmentsSnapshot = await getDocs(appointmentsRef);

    const appointments: AppointmentExport[] = [];

    appointmentsSnapshot.forEach((doc) => {
      const data = doc.data();
      appointments.push({
        id: doc.id,
        type: data.type || '',
        professionalName: data.professional_name || '',
        professionalId: data.professional_id,
        date: data.date?.toISOString() || new Date().toISOString(),
        time: data.time || '',
        status: data.status || 'scheduled',
        notes: data.notes,
        createdAt: data.createdAt?.toISOString() || new Date().toISOString(),
      });
    });

    return appointments;
  }

  /**
   * Busca dados de evoluções SOAP
   */
  private async getEvolutionsData(): Promise<EvolutionExport[]> {
    const evolutionsRef = collection(db, 'users', this.userId, 'evolutions');
    const evolutionsSnapshot = await getDocs(evolutionsRef);

    const evolutions: EvolutionExport[] = [];

    evolutionsSnapshot.forEach((doc) => {
      const data = doc.data();
      evolutions.push({
        id: doc.id,
        sessionNumber: data.session_number || 0,
        date: data.date?.toISOString() || new Date().toISOString(),
        professionalName: data.professional_name || '',
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        painLevel: data.pain_level || 0,
      });
    });

    return evolutions;
  }

  /**
   * Busca dados de mensagens
   */
  private async getMessagesData(): Promise<{ sent: MessageExport[]; received: MessageExport[] }> {
    // Implementação placeholder - ajustar conforme estrutura real
    return {
      sent: [],
      received: [],
    };
  }

  /**
   * Busca dados de saúde (wellness, integrações)
   */
  private async getHealthData(): Promise<any> {
    // Implementação placeholder - ajustar conforme estrutura real
    return {
      wellness: {},
      integrations: {},
    };
  }

  /**
   * Salva os dados exportados em um arquivo JSON
   */
  async saveToFile(data: PatientDataExport, filename?: string): Promise<string> {
    const json = JSON.stringify(data, null, 2);
    const fileName = filename || `fisioflow-dados-${this.userId}-${Date.now()}.json`;

    // Criar arquivo no sistema de arquivos
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return fileUri;
  }

  /**
   * Compartilha os dados exportados
   */
  async shareData(data: PatientDataExport): Promise<void> {
    try {
      const fileUri = await this.saveToFile(data);

      // Verificar se o arquivo existe
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('Falha ao criar arquivo de exportação');
      }

      // Verificar se compartilhamento está disponível
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Compartilhamento não disponível neste dispositivo');
      }

      // Compartilhar arquivo
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Exportar Dados - FisioFlow',
      });
    } catch (error) {
      console.error('Error sharing data:', error);
      throw error;
    }
  }

  /**
   * Gera um resumo dos dados para mostrar ao usuário antes da exportação
   */
  async getExportSummary(): Promise<{
    exercisePlans: number;
    appointments: number;
    evolutions: number;
    dataSize: string;
  }> {
    // Buscar contagens
    const plansRef = collection(db, 'users', this.userId, 'exercise_plans');
    const plansSnapshot = await getDocs(plansRef);

    const appointmentsRef = collection(db, 'users', this.userId, 'appointments');
    const appointmentsSnapshot = await getDocs(appointmentsRef);

    const evolutionsRef = collection(db, 'users', this.userId, 'evolutions');
    const evolutionsSnapshot = await getDocs(evolutionsRef);

    return {
      exercisePlans: plansSnapshot.size,
      appointments: appointmentsSnapshot.size,
      evolutions: evolutionsSnapshot.size,
      dataSize: 'Estimativa: ~' + (plansSnapshot.size + appointmentsSnapshot.size + evolutionsSnapshot.size) * 2 + 'KB',
    };
  }
}

/**
 * Função helper para exportar dados do paciente
 *
 * @param userId - ID do usuário/paciente
 * @param options - Opções de exportação
 * @returns Promise com os dados exportados
 */
export async function exportPatientData(
  userId: string,
  options?: DataExportOptions
): Promise<PatientDataExport> {
  const exporter = new DataExporter(userId);
  return await exporter.exportAll(options);
}

/**
 * Função helper para exportar e compartilhar dados do paciente
 *
 * @param userId - ID do usuário/paciente
 * @param options - Opções de exportação
 */
export async function exportAndSharePatientData(
  userId: string,
  options?: DataExportOptions
): Promise<void> {
  const exporter = new DataExporter(userId);

  try {
    // Mostrar resumo antes de exportar
    const summary = await exporter.getExportSummary();

    // Exportar dados
    const data = await exporter.exportAll(options);

    // Compartilhar
    await exporter.shareData(data);
  } catch (error) {
    console.error('Error in exportAndSharePatientData:', error);
    Alert.alert(
      'Erro na Exportação',
      'Não foi possível exportar seus dados. Tente novamente.'
    );
    throw error;
  }
}

/**
 * Função helper para obter resumo da exportação
 */
export async function getExportSummary(userId: string): Promise<{
  exercisePlans: number;
  appointments: number;
  evolutions: number;
  dataSize: string;
}> {
  const exporter = new DataExporter(userId);
  return await exporter.getExportSummary();
}

export default DataExporter;
